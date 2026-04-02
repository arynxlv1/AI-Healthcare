from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import TriageSession
from ..services.onnx_service import onnx_service
from ..services.llm_service import llm_service
from ..services.rag_service import rag_ingestor
from ..services.audit_service import log_action
from ..middleware.pii_stripper import strip_pii
from ..core.mapping import map_symptoms_to_vector
from app.core.limiter import limiter

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    patient_query: Optional[str] = None
    hospital_id: str


class HistoryItem(BaseModel):
    id: str
    symptoms: List[Any]
    urgency_level: Optional[str] = None
    onnx_predictions: Optional[List[Any]] = None
    status: str
    created_at: Any

    class Config:
        from_attributes = True


@router.post("/diagnose")
@limiter.limit("30/minute")
async def diagnose(request: Request, request_data: DiagnosisRequest, db: Session = Depends(get_db)):
    # Stage 0: PII Stripping
    raw_query = request_data.patient_query or " ".join(request_data.symptoms)
    clean_query = strip_pii(raw_query)

    user_id = getattr(request.state, "user_id", None)
    # Fallback: decode token directly if middleware didn't set state
    if not user_id:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from ..services.auth_service import AuthService
            payload = AuthService.decode_token(auth.split(" ", 1)[1])
            if payload:
                user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Security: always use hospital_id from the JWT claim.
    # Never fall back to the client-supplied value — a super_admin (who has no
    # hospital_id in their JWT) should not be able to inject an arbitrary one.
    jwt_hospital_id = getattr(request.state, "hospital_id", None)
    if not jwt_hospital_id:
        # Decode directly in case middleware didn't set state (e.g. super_admin bypass)
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from ..services.auth_service import AuthService
            payload = AuthService.decode_token(auth.split(" ", 1)[1])
            if payload:
                jwt_hospital_id = payload.get("hospital_id")
    # super_admin has no hospital affiliation — use a sentinel value
    hospital_id = jwt_hospital_id or "SYSTEM"

    # Stage 1: ONNX Classification
    symptom_vector = map_symptoms_to_vector(request_data.symptoms)
    onnx_result = onnx_service.predict(symptom_vector)

    session = TriageSession(
        patient_id=user_id,
        hospital_id=hospital_id,
        symptoms=request_data.symptoms,
        symptom_text=clean_query,
        onnx_predictions=onnx_result.get("predictions"),
        urgency_level=onnx_result.get("urgency"),
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_action(
        user_id=user_id,
        action="PII_STRIPPED",
        resource_type="TriageSession",
        resource_id=session.id,
        details={"pii_stripped": raw_query != clean_query},
        db=db,
    )

    return {
        "session_id": session.id,
        "onnx_top_candidates": onnx_result,
        "status": "Success",
    }


@router.get("/history", response_model=List[HistoryItem])
async def get_patient_history(request: Request, db: Session = Depends(get_db)):
    user_id = getattr(request.state, "user_id", None)
    # Fallback: decode token directly if middleware didn't set state
    if not user_id:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from ..services.auth_service import AuthService
            payload = AuthService.decode_token(auth.split(" ", 1)[1])
            if payload:
                user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    sessions = (
        db.query(TriageSession)
        .filter(TriageSession.patient_id == user_id)
        .order_by(TriageSession.created_at.desc())
        .all()
    )
    return sessions


@router.get("/diagnose/stream")
async def diagnose_stream(session_id: str, request: Request, db: Session = Depends(get_db)):
    # Defense-in-depth: verify the caller is authenticated even though RBAC middleware
    # already enforces /api/ai. One misconfiguration shouldn't expose PHI.
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from ..services.auth_service import AuthService
            payload = AuthService.decode_token(auth.split(" ", 1)[1])
            if payload:
                user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    session = db.query(TriageSession).filter(TriageSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        yield "data: {\"stage\": 1, \"content\": \"ONNX analysis complete\"}\n\n"

        context_docs = []
        try:
            results = await rag_ingestor.search(session.symptom_text or "")
            context_docs = [r.get("content", "") for r in results]
        except Exception as e:
            print(f"RAG search error: {e}")
            context_docs = ["No specific medical records found in knowledge base."]

        disease_label = (
            session.onnx_predictions[0]["label"]
            if session.onnx_predictions
            else "Unknown"
        )

        # Pull risk metadata from the ONNX service
        from ..services.onnx_service import DISEASE_META
        meta = DISEASE_META.get(disease_label, {"risk": "low", "steps": ["Consult a healthcare professional"]})

        async for token_chunk in llm_service.stream_reasoning(
            disease_label=disease_label,
            symptom_text=session.symptom_text,
            context_docs=context_docs,
            risk_level=meta["risk"],
            immediate_steps=meta["steps"],
            top_predictions=session.onnx_predictions or [],
        ):
            yield f"data: {token_chunk}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chat")
async def nurse_chat(chat_req: ChatRequest, request: Request):
    """Free-form AI nurse chatbot — streams tokens from Ollama."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_message = strip_pii(chat_req.message)

    async def stream():
        async for chunk in llm_service.stream_chat(
            message=user_message,
            history=[(m.role, m.content) for m in (chat_req.history or [])],
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


class DiagnosticChatRequest(BaseModel):
    history: List[ChatMessage]  # full conversation so far


@router.post("/diagnostic-chat")
async def diagnostic_chat(req: DiagnosticChatRequest, request: Request):
    """MCQ diagnostic interview — streams the next question or final diagnosis."""
    if not getattr(request.state, "user_id", None):
        raise HTTPException(status_code=401, detail="Authentication required")
    async def stream():
        async for chunk in llm_service.stream_diagnostic(
            history=[(m.role, m.content) for m in req.history],
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/ollama/status")
async def ollama_status():
    """Check if Ollama is reachable and which models are available."""
    import httpx
    from ..core.config import settings
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                return {"online": True, "models": models, "active_model": settings.OLLAMA_MODEL}
    except Exception:
        pass
    return {"online": False, "models": [], "active_model": settings.OLLAMA_MODEL}
