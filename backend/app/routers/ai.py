from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from ..services.onnx_service import onnx_service
from ..services.llm_service import llm_service
from ..services.rag_service import rag_ingestor
from ..middleware.pii_stripper import strip_pii

router = APIRouter()

class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    patient_query: Optional[str] = None

@router.post("/diagnose")
async def diagnose(request: DiagnosisRequest):
    # Stage 0: PII Stripping (handled by middleware but logic here for safety)
    query = request.patient_query or " ".join(request.symptoms)
    clean_query = strip_pii(query)
    
    # Stage 1: ONNX Classification
    onnx_result = onnx_service.predict(request.symptoms)
    
    # Stage 2: RAG + LLM Reasoning
    # For now, return a combined result
    return {
        "onnx_top_candidates": onnx_result,
        "pii_stripped": clean_query,
        "status": "Success"
    }

@router.get("/diagnose/stream")
async def diagnose_stream(query: str):
    # This would return an EventSourceResponse
    from fastapi.responses import StreamingResponse
    
    async def event_generator():
        # Sync Stage 1
        yield "data: {\"stage\": 1, \"content\": \"ONNX analysis complete\"}\n\n"
        # Async Stage 2 tokens
        async for token in llm_service.stream_reasoning(query):
            yield f"data: {token}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
