
# File: token_server.py
from fastapi import FastAPI
from livekit import access_token
from livekit.models import VideoGrant
import os

app = FastAPI()

@app.get("/token")
async def get_token():
    # Use environment variables in production!
        api_key="APIG9Cqvqr5oGKV",
        api_secret="mgmoqqMlfrgQUtuoqe2pOz5M5USO5a2ARa9vNe50M97B"
    
        grant = VideoGrant(
        room_join=True,
        room="default_room",
    )
    
        token = access_token.AccessToken(api_key, api_secret)
        token.add_grant(grant)
        token.identity = "agent-user"
    
    return {"token": token.to_jwt()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)    