import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
import io
import pypdf
from core.rag_engine import add_document
from core.chassis import AgentChassis
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from core.config import settings

# Load environment variables from .env file at startup
load_dotenv()

app = FastAPI(title="AI Agent Factory Core Runtime Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    # 1. Initialize robust LLM routing with fallbacks for supervisor
    primary_llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        api_key=settings.GROQ_API_KEY,
        max_retries=0
    )
    
    fallbacks = []
    if settings.CEREBRAS_API_KEY:
        cerebras_llm = ChatOpenAI(
            model="llama3.1-70b",
            base_url="https://api.cerebras.ai/v1",
            api_key=settings.CEREBRAS_API_KEY,
            temperature=0
        )
        fallbacks.append(cerebras_llm)
        
    if settings.OPENROUTER_API_KEY:
        openrouter_llm = ChatOpenAI(
            model="meta-llama/llama-3.3-70b-instruct",
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            temperature=0
        )
        fallbacks.append(openrouter_llm)
        
    if fallbacks:
        robust_llm = primary_llm.with_fallbacks(fallbacks)
    else:
        robust_llm = primary_llm

    structured_router = robust_llm.with_structured_output(AgentRoute, method="json_mode")
    
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

@app.post("/upload", dependencies=[Depends(verify_api_key)])
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename
    if not (filename.endswith(".txt") or filename.endswith(".csv") or filename.endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .txt, .csv, or .pdf file."
        )
        
    try:
        content = await file.read()
        
        if filename.endswith(".pdf"):
            pdf_file = io.BytesIO(content)
            reader = pypdf.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        else:
            text = content.decode("utf-8", errors="ignore")
            
        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="File content is empty or could not be parsed."
            )
            
        add_document(text, filename)
        
        return {
            "status": "Success",
            "filename": filename,
            "message": f"Successfully parsed and indexed {filename} into company knowledge base."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process and index file: {str(e)}"
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
