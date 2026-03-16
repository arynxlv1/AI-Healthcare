from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str # patient, doctor, hospital_admin, super_admin
    hospital_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None

# Hospital Schemas
class HospitalBase(BaseModel):
    name: str
    location: Optional[str] = None

class HospitalCreate(HospitalBase):
    pass

class HospitalResponse(HospitalBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Triage Schemas
class TriageSessionBase(BaseModel):
    symptoms: List[str]
    symptom_text: Optional[str] = None

class TriageSessionCreate(TriageSessionBase):
    hospital_id: str

class TriageSessionResponse(TriageSessionBase):
    id: str
    patient_id: str
    hospital_id: str
    onnx_predictions: Optional[Dict[str, Any]] = None
    urgency_level: Optional[str] = None
    llm_reasoning: Optional[str] = None
    status: str
    doctor_id: Optional[str] = None
    doctor_notes: Optional[str] = None
    final_diagnosis: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TriageConfirm(BaseModel):
    final_diagnosis: str
    doctor_notes: Optional[str] = None

class TriageOverride(BaseModel):
    final_diagnosis: str
    doctor_notes: str # Mandatory for overrides

# AI Schemas
class DiagnosisInput(BaseModel):
    symptoms: List[str]
    symptom_text: Optional[str] = None

class DiagnosisPrediction(BaseModel):
    icd10_code: str
    disease_name: str
    probability: float

class DiagnosisResponse(BaseModel):
    session_id: str
    stage1_predictions: List[DiagnosisPrediction]
    urgency_level: str
    stage2_reasoning: Optional[str] = None # Will be streamed, but JSON fallback

# FL Schemas
class FLRoundResponse(BaseModel):
    id: int
    global_accuracy: float
    participating_hospitals_count: int
    epsilon_used: float
    model_version: str
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Schemas
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
