from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Float, Text
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, nullable=False) # patient, doctor, hospital_admin, super_admin
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hospital = relationship("Hospital", back_populates="users")
    patient_triage_sessions = relationship("TriageSession", foreign_keys="[TriageSession.patient_id]", back_populates="patient")
    doctor_triage_sessions = relationship("TriageSession", foreign_keys="[TriageSession.doctor_id]", back_populates="doctor")

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    location = Column(String)
    api_key = Column(String, unique=True, index=True) # For FL client auth
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="hospital")
    triage_sessions = relationship("TriageSession", back_populates="hospital")

class TriageSession(Base):
    __tablename__ = "triage_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    symptoms = Column(JSON, nullable=False) # List of symptom codes
    symptom_text = Column(Text) # Free-text description
    
    # Stage 1 Result (ONNX)
    onnx_predictions = Column(JSON) # Top-5 candidates with probabilities
    urgency_level = Column(String) # high, medium, low
    
    # Stage 2 Result (Ollama)
    llm_reasoning = Column(Text)
    
    # Doctor Review
    status = Column(String, default="pending") # pending, confirmed, overridden
    doctor_id = Column(String, ForeignKey("users.id"), nullable=True)
    doctor_notes = Column(Text)
    final_diagnosis = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_triage_sessions")
    hospital = relationship("Hospital", back_populates="triage_sessions")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_triage_sessions")

class FLRound(Base):
    __tablename__ = "fl_rounds"

    id = Column(Integer, primary_key=True, index=True)
    global_accuracy = Column(Float)
    participating_hospitals_count = Column(Integer)
    epsilon_used = Column(Float)
    model_version = Column(String)
    config = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # e.g., triage_confirmed, fl_round_triggered
    resource_type = Column(String) # e.g., triage_session, fl_round
    resource_id = Column(String)
    details = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
