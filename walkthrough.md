# Federated Health AI — Walkthrough

## Technical Architecture Overview

The system follows a tiered architecture designed for healthcare compliance:

- **Backend**: FastAPI + SQLAlchemy (SQLite dev / PostgreSQL prod), RBAC middleware, JWT auth
- **AI Pipeline**:
  - Stage 1: ONNX inference for fast disease classification (sub-10ms)
  - Stage 2: RAG-augmented clinical reasoning via Ollama (llama3.2)
- **Federated Learning**: Privacy-preserving training via Flower + Opacus (DP-SGD)
- **Frontend**: React + Vite SPA with role-based portals (Patient, Doctor, Hospital Admin, Super Admin)

## Portals

| Role | URL | Credentials |
|------|-----|-------------|
| Patient | `/patient` | `patient@example.com` / `password` |
| Doctor | `/doctor` | `doctor@example.com` / `password` |
| Hospital Admin | `/hospital` | `admin@hosp001.com` / `password` |
| Super Admin | `/admin` | `admin@example.com` / `password` |

## Security & Privacy

- **PII Stripper**: Regex-based anonymization applied before any data hits the DB
- **RBAC Middleware**: Role + path prefix enforcement with `"/"` boundary matching to prevent prefix collisions
- **JWT**: `sub` claim stores email; `hospital_id` and `role` embedded in token — never trusted from request body
- **Opacus DP**: `(ε, δ)`-differential privacy during FL training rounds; hard budget cap enforced server-side
- **Hospital Isolation**: Triage queries filtered by `hospital_id` from JWT, not client input

## Running Locally

```bash
# 1. Install backend deps
cd backend
pip install -r requirements.txt

# 2. Seed the database
cd ..
python scripts/seed_db.py

# 3. Start backend (from backend/)
cd backend
..\venv\Scripts\uvicorn app.main:app --reload

# 4. Start frontend (separate terminal)
cd frontend
npm install
npm run dev

# 5. Start Ollama (separate terminal)
ollama serve
# Pull the model if not already done:
ollama pull llama3.2:latest
```

Frontend runs at **http://localhost:3000**, backend at **http://localhost:8000**.

## Running with Docker

```bash
# Core stack (backend + frontend + redis)
docker compose up

# Include the Flower FL server
docker compose --profile fl up
```

## Running Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

## FL Layer

The federated learning stack is in `fl_client/` and `fl_server/`. To run a real FL round:

```bash
# Terminal 1 — start the aggregation server
python -m fl_server.server

# Terminal 2+ — start hospital clients (one per hospital)
python -m fl_client.client
```

The server requires `MIN_CLIENTS = 2` before starting a round. After each round, `model_registry.py` saves weights and exports `ml/model.onnx` — which the FastAPI backend picks up automatically on the next inference call.

The "Trigger FL Round" button in the Hospital Dashboard runs a simulated round via the backend worker (no Flower server required) and persists results to the DB.

## Verification

```bash
# With backend running, verify RBAC and hospital isolation:
python scripts/verify_security.py
```
