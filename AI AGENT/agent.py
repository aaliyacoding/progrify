from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import noise_cancellation, google
from livekit import api
import logging
import json
import asyncio
import os
import sys
from typing import Dict
from prompts import AGENT_INSTRUCTION, SESSION_GREETING, MODULE_RESPONSES

load_dotenv()

class Assistant(Agent):
    def __init__(self):
        super().__init__(
            instructions=AGENT_INSTRUCTION,
            llm=google.beta.realtime.RealtimeModel(
                temperature=0.7,
            ),
            tools=[],
        )
        self.current_specialization = "general"
        self.sessions: Dict[str, AgentSession] = {}
        self._lock = asyncio.Lock()

    async def handle_message(self, message: str, session: AgentSession):
        try:
            try:
                data = json.loads(message)
                message_text = data.get('text', message)
            except json.JSONDecodeError:
                message_text = message

            message_lower = message_text.lower()
            if "switch to" in message_lower:
                for key in MODULE_RESPONSES:
                    if key in message_lower:
                        self.current_specialization = key
                        await self._send_response(session, f"Switched to {key} mode.")
                        await self._send_response(session, MODULE_RESPONSES[key])
                        return

            response = MODULE_RESPONSES.get(self.current_specialization, SESSION_GREETING)
            await self._send_response(session, response)

        except Exception as e:
            logging.error(f"Error handling message: {str(e)}")
            await self._send_response(session, "Sorry, I encountered an error.")

    async def _send_response(self, session: AgentSession, message: str):
        try:
            await session.say(message)
            await session.send_data(message.encode('utf-8'))
        except Exception as e:
            logging.error(f"Failed to send response: {str(e)}")
            await self._cleanup_session(session)

    async def _cleanup_session(self, session: AgentSession):
        async with self._lock:
            if session.id in self.sessions:
                del self.sessions[session.id]
        try:
            await session.close()
        except Exception:
            pass

async def entrypoint(ctx: agents.JobContext):
    assistant = Assistant()
    session = AgentSession()
    
    async def on_data_received(payload: bytes, participant):
        if participant.identity == "ai-agent":
            return
            
        try:
            message = payload.decode('utf-8')
            await assistant.handle_message(message, session)
        except Exception as e:
            logging.error(f"Error processing data: {str(e)}")

    ctx.room.on("data_received", on_data_received)

    try:
        await session.start(
            room=ctx.room,
            agent=assistant,
            room_input_options=RoomInputOptions(
                audio_enabled=True,
                video_enabled=False,
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
        await ctx.connect()
    except Exception as e:
        logging.error(f"Failed to start agent: {str(e)}")
        await session.close()
        raise

def generate_token():
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    # Create token with all required permissions
    token = api.AccessToken(api_key, api_secret)
    token.identity = "ai-agent"
    token.name = "AI Assistant"
    token.metadata = "{}"
    
    # Set explicit permissions
    token.add_grant(api.VideoGrants(
        room_join=True,
        room="default_room",
        room_admin=True,
        room_list=True,
        room_record=True
    ))
    
    return token.to_jwt()

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    try:
        # Print token for debugging
        token = generate_token()
        print("Generated Token:", token)
        print(f"Test this token at: https://livekit.io/token-test?token={token}&url=wss://progrify-agent-3mrmq7y4.livekit.cloud")
        
        # Run in dev mode
        if len(sys.argv) > 1 and sys.argv[1] == "dev":
            agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
        else:
            agents.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
    except Exception as e:
        logging.error(f"Failed to start agent: {str(e)}")
        raise