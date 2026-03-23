import sys
import os
from sqlalchemy.orm import Session
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.database import SessionLocal, engine
from app.models.models import Base, User, Hospital, TriageSession
from app.services.auth_service import AuthService

def seed():
    print("Seeding database...")
    # Base.metadata.drop_all(bind=engine) # Uncomment if you want a complete reset
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Create Hospital
    h1 = db.query(Hospital).filter(Hospital.id == "HOSP_001").first()
    if not h1:
        h1 = Hospital(
            id="HOSP_001",
            name="General Medical Center",
            location="New York, NY",
            api_key="demo_api_key_123"
        )
        db.add(h1)
    
    # 2. Create Users
    users_to_create = [
        {
            "email": "admin@example.com",
            "full_name": "Super Admin",
            "role": "super_admin",
            "hospital_id": None,
            "password": "password"
        },
        {
            "email": "doctor@example.com",
            "full_name": "Dr. Smith",
            "role": "doctor",
            "hospital_id": "HOSP_001",
            "password": "password"
        },
        {
            "email": "patient@example.com",
            "full_name": "John Doe",
            "role": "patient",
            "hospital_id": "HOSP_001",
            "password": "password"
        },
        {
            "email": "admin@hosp001.com",
            "full_name": "Hospital Admin",
            "role": "hospital_admin",
            "hospital_id": "HOSP_001",
            "password": "password"
        }
    ]
    
    for u_data in users_to_create:
        user = db.query(User).filter(User.email == u_data["email"]).first()
        if not user:
            user = User(
                email=u_data["email"],
                full_name=u_data["full_name"],
                role=u_data["role"],
                hospital_id=u_data["hospital_id"],
                hashed_password=AuthService.get_password_hash(u_data["password"])
            )
            db.add(user)
    
    db.commit()
    
    # 3. Create Mock Triage Session
    patient = db.query(User).filter(User.email == "patient@example.com").first()
    if patient:
        session = db.query(TriageSession).first()
        if not session:
            session = TriageSession(
                patient_id=patient.id,
                hospital_id="HOSP_001",
                symptoms=["chest-pain", "shortness-of-breath"],
                symptom_text="Heavy chest pain for 2 hours.",
                onnx_predictions=[{"label": "Potential Cardiac Event", "probability": 0.85}],
                urgency_level="high",
                status="pending"
            )
            db.add(session)
            db.commit()

    print("Database seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed()
