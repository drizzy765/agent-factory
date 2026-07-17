# AI Agent Factory

A multi-agent runtime that deploys specialist AI personas from a single FastAPI backend. Each agent is defined by a YAML profile, equipped with tools, and orchestrated through LangGraph. A React dashboard lets you route tasks, upload knowledge, and monitor execution.

## Features

- **Supervisor routing** — Automatically delegates user prompts to the best specialist agent
- **Profile-based agents** — Swap personalities and tools via YAML without changing core code
- **Tool ecosystem** — Built-in tools for PII masking, CRM lookup, RAG search, Python sandbox, and AWS S3
- **LLM fallbacks** — Groq primary with Cerebras and OpenRouter fallback tiers
- **Document ingestion** — Upload `.txt`, `.csv`, or `.pdf` files into a local Chroma vector store
- **Web dashboard** — React UI for health checks, agent selection, file uploads, and BYOK client keys

## Architecture

```text
┌─────────────────┐         ┌──────────────────────────────────────┐
│  Frontend       │  HTTPS  │  Backend (FastAPI + LangGraph)       │
│  React + Vite   │ ──────► │                                      │
│  (Vercel)       │         │  /health          /upload            │
└─────────────────┘         │  /supervisor      /run/{profile}     │
                            │                                      │
                            │  ┌────────────┐   ┌───────────────┐  │
                            │  │ AgentChassis│──►│ YAML Profiles │  │
                            │  └────────────┘   └───────────────┘  │
                            │         │                            │
                            │         ▼                            │
                            │  Tools · RAG · MCP · AWS · Azure     │
                            └──────────────────────────────────────┘
```

## Project Structure

```text
agent-factory/
├── main.py                 # FastAPI entrypoint and API routes
├── core/
│   ├── chassis.py          # LangGraph agent orchestration
│   ├── config.py           # Environment settings
│   └── rag_engine.py       # Chroma vector store + Cohere embeddings
├── profiles/               # Agent personality definitions (YAML)
│   ├── 01_market_analyst.yaml
│   ├── 02_ai_trust.yaml
│   └── 03_outbound_sdr.yaml
├── tools/                  # LangChain tools used by agents
├── mcp_servers/            # MCP bridges (Azure sandbox, AWS S3)
├── frontend/               # React dashboard (Vite)
├── data/chroma_db/         # Local vector DB (gitignored, created at runtime)
├── Dockerfile
├── requirements.txt
└── .env.template
```

## Agent Profiles

| Profile | Role | Tools |
|---------|------|-------|
| `01_market_analyst` | Quantitative financial research analyst | S3 data lake, Python sandbox, company knowledge |
| `02_ai_trust` | Enterprise AI trust and data governance | PII masker, company knowledge |
| `03_outbound_sdr` | Outbound sales development rep | CRM fetcher, company knowledge |

Add new agents by creating a YAML file in `profiles/` and referencing it from the supervisor prompt in `main.py`.

## Prerequisites

- Python 3.11+
- Node.js 18+ (for the frontend)
- API keys for at least one LLM provider (Groq recommended)

## Local Development

### 1. Clone and configure environment

```bash
git clone <your-repo-url>
cd agent-factory
cp .env.template .env
```

Edit `.env` with your keys (see [Environment Variables](#environment-variables) below).

### 2. Run the backend

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite dev URL (typically [http://localhost:5173](http://localhost:5173)).

In the dashboard, set **HOST** to `http://127.0.0.1:8000` and enter your `FACTORY_MASTER_KEY` as the API key.

### 4. Run with Docker

```bash
docker build -t agent-factory-engine .
docker run -p 8000:8000 --env-file .env agent-factory-engine
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FACTORY_MASTER_KEY` | Yes | API authentication key (`X-Factory-API-Key` header) |
| `GROQ_API_KEY` | Yes* | Primary LLM provider |
| `COHERE_API_KEY` | Yes* | Embeddings for the RAG knowledge base |
| `CEREBRAS_API_KEY` | No | Fallback LLM tier |
| `OPENROUTER_API_KEY` | No | Fallback LLM tier |
| `AWS_ACCESS_KEY_ID` | No | S3 data lake access for market analyst |
| `AWS_SECRET_ACCESS_KEY` | No | S3 data lake access |
| `AWS_DEFAULT_REGION` | No | AWS region (default: `us-east-1`) |
| `AZURE_TENANT_ID` | No | Azure identity for dynamic sessions |
| `AZURE_CLIENT_ID` | No | Azure identity |
| `AZURE_CLIENT_SECRET` | No | Azure identity |
| `AZURE_DYNAMIC_SESSION_POOL_URL` | No | Azure Container Apps sandbox endpoint |
| `ENVIRONMENT` | No | Deployment environment (default: `development`) |

\*Required for full functionality. Agents may fail without LLM and RAG keys.

## API Reference

All routes except `/health` require the header:

```text
X-Factory-API-Key: <your FACTORY_MASTER_KEY>
```

Optional client BYOK headers (override server-side fallback keys):

```text
X-Client-OpenRouter-Key: <openrouter-key>
X-Client-Cerebras-Key: <cerebras-key>
```

### `GET /health`

Health check. No authentication required.

```bash
curl http://localhost:8000/health
```

### `POST /supervisor`

Analyzes the user prompt and routes it to the best specialist agent automatically.

```bash
curl -X POST http://localhost:8000/supervisor \
  -H "Content-Type: application/json" \
  -H "X-Factory-API-Key: your_key" \
  -d '{"input": "Draft a cold email for our SaaS product"}'
```

### `POST /run/{agent_profile}`

Run a specific agent profile directly.

```bash
curl -X POST http://localhost:8000/run/02_ai_trust \
  -H "Content-Type: application/json" \
  -H "X-Factory-API-Key: your_key" \
  -d '{"input": "Mask PII in: John Doe, john@example.com, 555-123-4567"}'
```

Valid profiles: `01_market_analyst`, `02_ai_trust`, `03_outbound_sdr`

### `POST /upload`

Upload a document (`.txt`, `.csv`, or `.pdf`) to the company knowledge base.

```bash
curl -X POST http://localhost:8000/upload \
  -H "X-Factory-API-Key: your_key" \
  -F "file=@./document.pdf"
```

## Deployment

Recommended stack: **backend on Render**, **frontend on Vercel**.

### Backend — Render (Docker)

1. Create a **Web Service** connected to this repo
2. Set **Environment** to **Docker** (uses the root `Dockerfile`)
3. Set **Port** to `8000`
4. Use an instance with at least **2 GB RAM** (Chroma + embeddings are memory-intensive)
5. Add environment variables: `FACTORY_MASTER_KEY`, `GROQ_API_KEY`, `COHERE_API_KEY`, and any optional keys
6. Deploy and verify: `https://<your-service>.onrender.com/health`

**Notes:**
- Free-tier services sleep when idle; first request may be slow
- `data/chroma_db` is ephemeral unless you attach a Render persistent disk at `/app/data`

### Frontend — Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

After deploy, open the Vercel URL and set **HOST** to your Render backend URL (e.g. `https://your-api.onrender.com`).

### Alternative — Azure Container Registry

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and pushes the Docker image to Azure Container Registry on pushes to `main`. Configure these repository secrets:

- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`

See [AGENT.MD](./AGENT.MD) for the full hybrid Azure/AWS architecture specification.

## Creating a New Agent

1. Add a YAML profile in `profiles/`:

```yaml
agent_id: "04_my_agent"
personality:
  role: "My Specialist Agent"
  system_prompt: |
    You are an expert at ...
tools:
  - "query_company_knowledge"
  - "pii_regex_masker"
```

2. Register the profile in the supervisor routing prompt in `main.py` if you want auto-routing
3. Add the agent to `AGENT_PROFILES` in `frontend/src/App.jsx` for dashboard access

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI, Uvicorn |
| Agents | LangGraph, LangChain |
| LLMs | Groq, Cerebras, OpenRouter |
| Vector DB | ChromaDB |
| Embeddings | Cohere |
| Frontend | React 19, Vite 8 |
| Cloud | AWS S3, Azure Dynamic Sessions (optional) |

## License

Add your license here.
