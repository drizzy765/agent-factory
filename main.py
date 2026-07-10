import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import APIKeyHeader
from core.chassis import AgentChassis
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq

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

# --- SUPERVISOR ROUTING SCHEMA ---
class AgentRoute(BaseModel):
    destination: str = Field(
        description="The exact profile name to route to. Must be exactly one of: '01_market_analyst', '02_ai_trust', '03_outbound_sdr'."
    )
    reasoning: str = Field(
        description="A brief 1-sentence explanation of why this agent was chosen."
    )

@app.post("/supervisor", dependencies=[Depends(verify_api_key)])
async def factory_supervisor(user_payload: dict):
    user_input = user_payload.get("input", "")
    
    # 1. Upgrade to the active 70b model for better logical deduction
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0) 
    structured_router = llm.with_structured_output(AgentRoute, method="json_mode")
    
    # 2. Tighten the prompt to focus on actions, not buzzwords
    routing_prompt = f"""You are the Factory Floor Supervisor. 
    Analyze the user's request and assign it to the correct specialist agent based on the PRIMARY ACTION required.
    
    You MUST respond with a JSON object containing exactly these keys:
    - 'destination': The exact profile name to route to. Must be exactly one of: '01_market_analyst', '02_ai_trust', '03_outbound_sdr'.
    - 'reasoning': A brief 1-sentence explanation of why this agent was chosen.
    
    Specialist Agent Floor Plan:
    - '01_market_analyst': Choose this ONLY if the user wants financial data analysis, economic research, or market trends.
    - '02_ai_trust': Choose this ONLY if the user explicitly asks to mask, redact, sanitize, or secure sensitive data (PII).
    - '03_outbound_sdr': Choose this if the user wants to draft an email, pitch a product, or do sales outreach.
    
    CRITICAL: Ignore product buzzwords like "AI" in the user's request. Focus strictly on the core task.
    
    User Request: {user_input}"""
    
    try:
        # 3. Ask the LLM to make a routing decision
        decision = structured_router.invoke(routing_prompt)
        
        # 4. Dynamically spin up the chosen agent chassis
        worker = AgentChassis(profile_name=decision.destination)
        
        # 5. Execute the task using the chosen worker
        worker_output = worker.run(user_input)
        
        return {
            "status": "Success",
            "supervisor": {
                "delegated_to": decision.destination,
                "reasoning": decision.reasoning
            },
            "worker_output": worker_output
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supervisor Routing Failed: {str(e)}")

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
