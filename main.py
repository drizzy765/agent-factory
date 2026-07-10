import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import APIKeyHeader
from core.chassis import AgentChassis

# Load environment variables from .env file at startup
load_dotenv()

app = FastAPI(title="AI Agent Factory Core Runtime Engine")

# Define API Key header security scheme
API_KEY_NAME = "X-Factory-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Depends(api_key_header)):
    master_key = os.getenv("FACTORY_MASTER_KEY")
    if not master_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: FACTORY_MASTER_KEY environment variable is not set."
        )
    if not api_key or api_key != master_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Invalid or missing API key."
        )

@app.get("/health")
def health_check():
    return {"status": "Factory Floor Functional", "tier_routing": "Azure/AWS Verified"}

@app.post("/run/{agent_profile}", dependencies=[Depends(verify_api_key)])
async def execute_agent(agent_profile: str, user_payload: dict):
    try:
        # Step 1: Instantly morph the chassis into the requested personality
        factory_instance = AgentChassis(profile_name=agent_profile)

        # Step 2: Extract system instructions and tool assignments
        persona = factory_instance.profile.get("personality") or {}
        allocated_tools = factory_instance.profile.get("tools") or []

        # Step 3: Run the reasoning loop via LangGraph
        user_input = user_payload.get("input", "")
        output = factory_instance.run(user_input)

        return {
            "status": "Success",
            "activated_profile": agent_profile,
            "meta": {
                "role": persona.get("role") or factory_instance.profile.get("role") or "Unknown Role",
                "allocated_tools_count": len(allocated_tools)
            },
            "output": output
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{agent_profile}' does not exist on this floor.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
