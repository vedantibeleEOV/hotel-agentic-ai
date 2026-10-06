# Hotel Multi-Agent Operations Frontend

A modern React (Vite) application designed for autonomous hotel operations management, orchestrating room readiness, housekeeping, and maintenance agent workflows.

---

## 🏛 Architecture & CRUD Flow

```text
React Client (Port 5173)
   │
   ├── [hotelApi.js] Centralized REST Client
   │      │
   │      ├── [GET  /api/tasks]                     --> READ: Fetch operational tasks with filters
   │      ├── [POST /api/tasks/{id}/complete]        --> UPDATE: Complete task & release staff
   │      ├── [POST /api/events/checkout]           --> CREATE: Process checkout event & dispatch
   │      ├── [POST /api/events/maintenance-issue]  --> CREATE: Report maintenance incident
   │      └── [POST /api/reset]                     --> RESET: Clear & re-seed PostgreSQL database
   │
FastAPI Backend (Port 8000)
   ├── OperationsOrchestratorAgent
   ├── RoomReadinessAgent
   ├── HousekeepingAgent
   └── MaintenanceAgent (with Gemini LLM Classification)
```

---

## 🚀 Running the Frontend

1. Ensure your FastAPI backend is running:
   ```bash
   cd ../hotel-agentic-ai
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Start the Vite React development server:
   ```bash
   cd hotel-frontend
   npm run dev
   ```

3. Open your browser at `http://localhost:5173`.
