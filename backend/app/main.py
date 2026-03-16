from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .routers import ai, auth, triage, fl
from .core.config import settings

from .middleware.rbac import rbac_middleware

app = FastAPI(title="Federated Health AI API")

# Configure Middlewares
@app.middleware("http")
async def add_rbac_middleware(request, call_next):
    return await rbac_middleware(request, call_next)

# Configure CORS
@app.middleware("http")
async def add_cors_middleware(request, call_next):
    # Standard CORSMiddleware is better, but since we are doing manual middleware:
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Diagnosis"])
app.include_router(triage.router, prefix="/api/triage", tags=["Triage Queue"])
app.include_router(fl.router, prefix="/api/fl", tags=["Federated Learning"])

@app.get("/")
async def root():
    return {"message": "Federated Health AI API is running"}
