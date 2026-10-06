# Hotel Operations AI (hotel-operations-ai)

An autonomous multi-agent AI framework for optimizing hotel operations, room readiness, maintenance classification, and guest service workflows.

## System Architecture

```text
hotel-operations-ai/
│
├── app/
│   ├── main.py
│   ├── config.py
│   │
│   ├── api/                # API Route handlers (event, room, task, approval)
│   ├── agents/             # Autonomous Agents (orchestrator, room readiness, housekeeping, maintenance, guest ops)
│   ├── prompts/            # Prompt templates for LLM agent behaviors
│   ├── tools/              # Actionable tool wrappers for agent execution
│   ├── workflows/          # State machines & room turnaround workflows
│   ├── policies/           # Policy engine, permission & autonomy rules
│   ├── services/           # Core business logic services
│   ├── integrations/       # PMS & third-party adapters
│   ├── models/             # Domain data models
│   ├── schemas/            # Pydantic input/output schemas
│   └── database/           # DB connections and repositories
│
├── frontend/               # React + Vite Multi-Agent Operations Dashboard
│   ├── src/                # Components, API client, & Styles
│   ├── package.json
│   └── Dockerfile
├── tests/                  # Unit and integration tests
├── scripts/                # Utility & demo seed scripts
├── docker-compose.yml      # PostgreSQL + LLM + FastAPI + React Frontend
├── .env.example
├── requirements.txt
└── README.md
```

## Quick Start

### 1. Run Backend (FastAPI)
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Operations Dashboard: [http://localhost:5173](http://localhost:5173)

### 3. Run Full-Stack with Docker Compose
```bash
docker-compose up --build
```