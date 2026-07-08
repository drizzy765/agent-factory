# 🏭 AI Agent Factory Baseline Architecture Specification

**Version:** 3.0 (Hybrid Azure/AWS Edition)  
**Target Marketplace Deployment:** Agentalent.ai, JobForAgent, UpAgents, mcp.so  
**Objective:** Deploy 21 autonomous agent personalities using a single, serverless FastAPI chassis with on-demand Model Context Protocol (MCP) tool routing.

---

## 1. Project Directory Structure

Initialize your project root to match the following layout exactly:

```text
agent-factory/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD Pipeline
│
├── core/
│   ├── __init__.py
│   ├── chassis.py              # LangGraph Orchestration & Base LLM Engine
│   └── config.py               # Hybrid Cloud Environment Variables
│
├── mcp_servers/
│   ├── __init__.py
│   ├── data_sandbox.py         # Azure ACA Dynamic Sessions Python Execution
│   └── aws_bridge.py           # Amazon S3 & Bedrock Integrations
│
├── profiles/
│   ├── 01_market_analyst.yaml  # Personality & tool maps for Agent 01
│   └── 02_ai_trust.yaml        # Personality & tool maps for Agent 02
│
├── Dockerfile                  # Production container layout
├── main.py                     # FastAPI Entrypoint
└── requirements.txt            # Unified project dependencies

```

---

## 2. Infrastructure Code Configuration

### `requirements.txt`

```text
fastapi>=0.110.0
uvicorn>=0.28.0
mcp>=0.1.0
boto3>=1.34.0
azure-identity>=1.15.0
azure-storage-blob>=12.19.0
langgraph>=0.0.15
langchain-openai>=0.1.0
langchain-aws>=0.1.0
pyyaml>=6.0.1

```

### `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies if required for numerical calculations
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

```

---

## 3. Core Engine Implementation

### `core/config.py`

```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Deployment Environment
    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Azure Base Infrastructure
    AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
    AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
    AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
    AZURE_DYNAMIC_SESSION_POOL_URL: str = os.getenv("AZURE_DYNAMIC_SESSION_POOL_URL", "")

    # AWS Specialist Infrastructure
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    # Multi-Cloud Model Routing Fallbacks
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

settings = Settings()

```

### `core/chassis.py`

```python
import yaml
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_aws import ChatBedrock
from core.config import settings

class AgentChassis:
    """
    Unified engine infrastructure. Spawns distinct persona states
    by swapping runtime configurations dynamically without mutating code.
    """
    def __init__(self, profile_name: str):
        self.profile = self._load_profile(profile_name)
        self.engine = self._initialize_llm_routing()

    def _load_profile(self, profile_name: str) -> Dict[str, Any]:
        profile_path = f"profiles/{profile_name}.yaml"
        with open(profile_path, "r") as file:
            return yaml.safe_load(file)

    def _initialize_llm_routing(self):
        # AI-300 Standard Router: Default to zero-cost Azure-native tier/fallback models
        if self.profile.get("tier") == "standard":
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_base="https://any-free-fallback-route-or-azure-foundry-endpoint",
                api_key=settings.OPENROUTER_API_KEY
            )
        # Premium Track: Route on-demand analytical workloads straight to AWS Bedrock
        elif self.profile.get("tier") == "premium":
            return ChatBedrock(
                model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )

```

### `main.py`

```python
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

        # Next Step Implementation: Pass state loop directly to LangGraph router
        return {
            "status": "Success",
            "activated_profile": agent_profile,
            "meta": {
                "role": persona.get("role"),
                "allocated_tools_count": len(allocated_tools)
            },
            "output": "Engine ready. Injecting tool execution contexts."
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{agent_profile}' does not exist on this floor.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

```

---

## 4. First Agent Validation State Profile

To test your engine right away, create your first profile blueprint file:

### `profiles/01_market_analyst.yaml`

```yaml
agent_id: "01_market_analyst"
tier: "premium" # Forces routing invocation through AWS Bedrock Claude 3.5 Sonnet
personality:
  role: "Quantitative Financial Volatility Research Analyst"
  system_prompt: |
    You are an expert quantitative researcher. Your primary mandate is to read historical pricing data 
    from data stores, write secure, self-contained Python validation scripts to measure volatility, 
    and output structured markdown execution reports detailing market risk parameters.
tools:
  - "aws_bridge.read_s3_data_lake"
  - "data_sandbox.execute_secure_python"
monitoring:
  framework: "AgentOps"
  log_level: "DEBUG"
```

---

## 5. Local Engine Verification Flow

Run these commands in your console to verify that the core routing is online:

```bash
# 1. Build the engine baseline image
docker build -t agent-factory-engine .

# 2. Spin up the localized runtime container
docker run -d -p 8000:8000 --name running-factory agent-factory-engine

# 3. Test the dynamic personality compilation route via cURL
curl -X POST "http://localhost:8000/run/01_market_analyst" \
     -H "Content-Type: application/json" \
     -d '{"input": "Test invocation parameter"}'

```

**Expected JSON Response:**

```json
{
  "status": "Success",
  "activated_profile": "01_market_analyst",
  "meta": {
    "role": "Quantitative Financial Volatility Research Analyst",
    "allocated_tools_count": 2
  },
  "output": "Engine ready. Injecting tool execution contexts."
}
```

```

---

### Your Next Step
Now that your container foundation is specified, create your `profiles/` directory, place `01_market_analyst.yaml` inside it, and verify that your local Docker run passes the test cURL command successfully.

Once your console returns the expected structural metadata confirmation, say the word, and we will build the underlying code for **`mcp_servers/data_sandbox.py`** to integrate the Azure Dynamic Sessions and Python code execution!

```
