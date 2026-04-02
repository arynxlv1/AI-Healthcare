# FedHealth AI

Privacy-preserving medical intelligence platform using federated learning, differential privacy, and on-device LLM reasoning.

## Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, SQLite (dev) / PostgreSQL (prod)
- **ML**: ONNX inference, PyTorch training, Flower federated learning, Opacus DP-SGD
- **AI**: Ollama (llama3.2) for clinical reasoning and nurse chatbot
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Infra**: Docker Compose, GitHub Actions CI, Redis (optional)

## Quick Start

**Prerequisites**: Python 3.11+, Node 20+, [Ollama](https://ollama.com)

```bash
# Clone and set up
git clone https://github.com/arynxlv1/AI-Healthcare.git
cd AI-Healthcare

# Backend
cd backend
pip install -r requirements.txt
cd ..
python scripts/seed_db.py        # creates test.db with 4 demo users

# Frontend
cd frontend
npm install

# Pull the LLM model
ollama pull llama3.2:latest
```

Then in three separate terminals:

```bash
# Terminal 1
cd backend && ..\venv\Scripts\uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev

# Terminal 3
ollama serve
```

Open **http://localhost:3000**.

## Demo Accounts

All passwords: `password`

| Email | Role |
|-------|------|
| `patient@example.com` | Patient |
| `doctor@example.com` | Doctor |
| `admin@hosp001.com` | Hospital Admin |
| `admin@example.com` | Super Admin |

## Docker

```bash
docker compose up                        # backend + frontend + redis
docker compose --profile fl up           # also starts the Flower FL server
```

## Tests

```bash
cd backend
pytest tests/ -v
```

## Project Structure

```
backend/        FastAPI app, RBAC middleware, ONNX service, LLM service
frontend/       React SPA — Patient, Doctor, Hospital, Admin portals
fl_client/      Flower hospital client with Opacus DP training
fl_server/      Flower aggregation server with privacy budget tracking
ml/             DiseaseClassifier model, training script, ONNX export
scripts/        DB seed, KB ingestion, security verification
```

## Architecture

See [walkthrough.md](./walkthrough.md) for a full technical walkthrough.
