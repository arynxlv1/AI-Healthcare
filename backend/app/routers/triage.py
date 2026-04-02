from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..core.database import get_db
from ..models.models import TriageSession
from ..services.audit_service import log_action

router = APIRouter()

class TriageCase(BaseModel):
    id: str
    patient_id: str
    hospital_id: str
    urgency: str
    symptoms: List[str]
    ai_diagnosis: str
    status: str

    class Config:
        from_attributes = True

@router.get("/queue", response_model=List[TriageCase])
async def get_queue(request: Request, db: Session = Depends(get_db)):
    role = getattr(request.state, "user_role", "anonymous")
    hospital_id = getattr(request.state, "hospital_id", None)
    
    query = db.query(TriageSession)
    
    # Hospital Isolation (RLS simulation at app level)
    if role != "super_admin":
        if not hospital_id:
            raise HTTPException(status_code=403, detail="Hospital ID not found in session")
        query = query.filter(TriageSession.hospital_id == hospital_id)
    
    sessions = query.all()
    
    # Map ORM to Pydantic
    return [
        TriageCase(
            id=s.id,
            patient_id=s.patient_id,
            hospital_id=s.hospital_id,
            urgency=s.urgency_level or "Low",
            symptoms=s.symptoms,
            ai_diagnosis=s.final_diagnosis or (s.onnx_predictions[0].get("label", "Unknown") if s.onnx_predictions and len(s.onnx_predictions) > 0 else "Unknown"),
            status=s.status
        ) for s in sessions
    ]

@router.post("/{case_id}/confirm")
async def confirm_case(case_id: str, request: Request, db: Session = Depends(get_db)):
    hospital_id = getattr(request.state, "hospital_id", None)
    session = db.query(TriageSession).filter(TriageSession.id == case_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if getattr(request.state, "user_role", "anonymous") != "super_admin" and session.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="Access denied to this hospital's data")
        
    session.status = "confirmed"
    db.commit()
    
    # Audit log
    log_action(
        user_id=getattr(request.state, "user_id", "demo_doctor"),
        action="CONFIRM_TRIAGE",
        resource_type="TriageSession",
        resource_id=case_id,
        details={"status": "confirmed"},
        db=db,
    )
    
    return {"message": f"Case {case_id} confirmed by doctor"}

@router.post("/{case_id}/override")
async def override_case(case_id: str, note: str, request: Request, db: Session = Depends(get_db)):
    hospital_id = getattr(request.state, "hospital_id", None)
    session = db.query(TriageSession).filter(TriageSession.id == case_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if getattr(request.state, "user_role", "anonymous") != "super_admin" and session.hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="Access denied to this hospital's data")
        
    if not note or len(note.strip()) < 5:
        raise HTTPException(status_code=422, detail="Clinical override requires detailed notes (min 5 characters)")

    session.status = "overridden"
    session.doctor_notes = note
    db.commit()
    
    # Audit log
    log_action(
        user_id=getattr(request.state, "user_id", "demo_doctor"),
        action="OVERRIDE_TRIAGE",
        resource_type="TriageSession",
        resource_id=case_id,
        details={"status": "overridden", "notes": note},
        db=db,
    )
    
    return {"message": f"Case {case_id} overridden with note: {note}"}
