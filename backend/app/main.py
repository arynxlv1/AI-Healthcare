from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .routers import ai, auth, triage, fl, ws, audit, train
from .core.config import settings
from .core.limiter import limiter
from .middleware.rbac import rbac_middleware

app = FastAPI(title="Federated Health AI API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(BaseHTTPMiddleware, dispatch=rbac_middleware)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Diagnosis"])
app.include_router(triage.router, prefix="/api/triage", tags=["Triage Queue"])
app.include_router(fl.router, prefix="/api/fl", tags=["Federated Learning"])
app.include_router(audit.router, prefix="/api/audit", tags=["Compliance"])
app.include_router(train.router, prefix="/api/train", tags=["Model Training"])
app.include_router(ws.router, prefix="/ws", tags=["WebSockets"])


@app.get("/")
async def root():
    return {"message": "Federated Health AI API is running"}
