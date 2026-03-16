from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel

router = APIRouter()

class TriageCase(BaseModel):
    id: str
    patient_id: str
    urgency: str
    symptoms: List[str]
    ai_diagnosis: str
    status: str

@router.get("/queue", response_model=List[TriageCase])
async def get_queue(request: Request):
    # Simulate RLS filtering by hospital_id
    hospital_id = request.headers.get("X-Hospital-ID", "HOSP_001")
    
    all_cases = [
        {
            "id": "CASE_001",
            "hospital_id": "HOSP_001",
            "patient_id": "PT_442",
            "urgency": "High",
            "symptoms": ["chest-pain", "shortness-of-breath"],
            "ai_diagnosis": "Potential Cardiac Event",
            "status": "Pending"
        },
        {
            "id": "CASE_002",
            "hospital_id": "HOSP_002",
            "patient_id": "PT_912",
            "urgency": "Medium",
            "symptoms": ["prolonged-cough", "fever"],
            "ai_diagnosis": "Pneumonia / Influenza",
            "status": "Pending"
        }
    ]
    
    filtered_cases = [c for c in all_cases if c["hospital_id"] == hospital_id]
    return filtered_cases

@router.post("/{case_id}/confirm")
async def confirm_case(case_id: str):
    return {"message": f"Case {case_id} confirmed by doctor"}

@router.post("/{case_id}/override")
async def override_case(case_id: str, note: str):
    return {"message": f"Case {case_id} overridden with note: {note}"}
