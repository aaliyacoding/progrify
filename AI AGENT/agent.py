from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import noise_cancellation, google
import logging
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

    async def handle_message(self, message: str, session: AgentSession):
        message_lower = message.lower()

        if "switch to" in message_lower:
            for key in MODULE_RESPONSES:
                if key in message_lower:
                    self.current_specialization = key
                    await session.say(f"Switched to {key} mode.")
                    await session.say(MODULE_RESPONSES[key])
                    return

        if self.current_specialization in MODULE_RESPONSES:
            await session.say(MODULE_RESPONSES[self.current_specialization])
        else:
            await session.say(SESSION_GREETING)


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession()
    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            audio_enabled=True,
            video_enabled=False,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )
    await ctx.connect()
    await session.say(SESSION_GREETING)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
