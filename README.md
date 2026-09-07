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
├── dashboard/              # Streamlit management dashboard
├── tests/                  # Unit and integration tests
├── scripts/                # Utility & demo seed scripts
├── .env.example
├── requirements.txt
└── README.md
```

## Quick Start

### 1. Setup Virtual Environment & Install Dependencies
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run API Server
```bash
uvicorn app.main:app --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)