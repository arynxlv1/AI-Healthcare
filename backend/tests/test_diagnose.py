"""
Diagnosis endpoint tests — hospital_id injection fix, ONNX result shape.
"""
from tests.conftest import get_token


def test_diagnose_uses_jwt_hospital_id(client):
    """
    Security regression: client-supplied hospital_id must be ignored.
    The session must be stored under the JWT's hospital_id (HOSP_001),
    not the attacker-supplied value in the request body.
    """
    token = get_token(client, "patient@example.com")
    r = client.post(
        "/api/ai/diagnose",
        json={"symptoms": ["fever", "cough"], "hospital_id": "ATTACKER_HOSPITAL"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "session_id" in data

    # Verify the stored session used the JWT hospital_id, not the injected one
    from tests.conftest import TestingSessionLocal
    from app.models.models import TriageSession
    db = TestingSessionLocal()
    session = db.query(TriageSession).filter(TriageSession.id == data["session_id"]).first()
    db.close()
    assert session is not None
    assert session.hospital_id != "ATTACKER_HOSPITAL", (
        "hospital_id injection succeeded — session stored attacker-supplied value"
    )
    # Patient belongs to HOSP_001, so that's what should be stored
    assert session.hospital_id == "HOSP_001"


def test_diagnose_returns_predictions(client):
    token = get_token(client, "patient@example.com")
    r = client.post(
        "/api/ai/diagnose",
        json={"symptoms": ["chest-pain", "shortness-of-breath"], "hospital_id": "HOSP_001"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    candidates = r.json()["onnx_top_candidates"]
    assert "predictions" in candidates
    assert len(candidates["predictions"]) > 0


def test_diagnose_requires_auth(client):
    r = client.post("/api/ai/diagnose", json={"symptoms": ["fever"], "hospital_id": "HOSP_001"})
    assert r.status_code in (401, 403)


def test_patient_history_returns_list(client):
    token = get_token(client, "patient@example.com")
    r = client.get("/api/ai/history", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)
