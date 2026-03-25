"""
Pytest fixtures — in-memory SQLite DB, seeded test users, test client.
Uses httpx.AsyncClient with ASGITransport to run the full middleware stack.
"""
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pytest.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.models.models import Base, User, Hospital
from app.services.auth_service import AuthService

TEST_DB_URL = "sqlite:///./test_pytest.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    if not db.query(Hospital).filter(Hospital.id == "HOSP_001").first():
        db.add(Hospital(id="HOSP_001", name="Test Hospital", location="Test City"))
    for email, role, hospital_id in [
        ("patient@example.com",  "patient",        "HOSP_001"),
        ("doctor@example.com",   "doctor",         "HOSP_001"),
        ("admin@hosp001.com",    "hospital_admin", "HOSP_001"),
        ("admin@example.com",    "super_admin",    None),
    ]:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(
                email=email,
                full_name=email.split("@")[0],
                role=role,
                hospital_id=hospital_id,
                hashed_password=AuthService.get_password_hash("password"),
            ))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    # Note: SQLite file cleanup skipped on Windows due to file lock timing


@pytest.fixture
def client():
    """Sync-compatible fixture that wraps the async client."""
    app.dependency_overrides[get_db] = override_get_db
    from starlette.testclient import TestClient
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


def get_token(client, email: str, password: str = "password") -> str:
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"]
