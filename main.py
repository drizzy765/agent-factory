from fastapi import FastAPI, HTTPException
from core.chassis import AgentChassis

app = FastAPI(title="AI Agent Factory Core Runtime Engine")

@app.get("/health")
def health_check():
    return {"status": "Factory Floor Functional", "tier_routing": "Azure/AWS Verified"}

@app.post("/run/{agent_profile}")
async def execute_agent(agent_profile: str, user_payload: dict):
    try:
        # Step 1: Instantly morph the chassis into the requested personality
        factory_instance = AgentChassis(profile_name=agent_profile)

        # Step 2: Extract system instructions and tool assignments
        persona = factory_instance.profile.get("personality")
        allocated_tools = factory_instance.profile.get("tools")

        # Step 3: Run the reasoning loop via LangGraph
        user_input = user_payload.get("input", "")
        output = factory_instance.run(user_input)

        return {
            "status": "Success",
            "activated_profile": agent_profile,
            "meta": {
                "role": persona.get("role"),
                "allocated_tools_count": len(allocated_tools)
            },
            "output": output
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{agent_profile}' does not exist on this floor.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
