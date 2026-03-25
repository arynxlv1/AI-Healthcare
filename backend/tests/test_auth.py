"""
Auth smoke tests — covers the JWT sub/id bug and register endpoint.
"""
import pytest
from tests.conftest import get_token


def test_login_patient(client):
    r = client.post("/api/auth/login", data={"username": "patient@example.com", "password": "password"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["role"] == "patient"


def test_login_doctor(client):
    r = client.post("/api/auth/login", data={"username": "doctor@example.com", "password": "password"})
    assert r.status_code == 200
    assert r.json()["role"] == "doctor"


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "patient@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", data={"username": "nobody@example.com", "password": "password"})
    assert r.status_code == 401


def test_register_returns_403(client):
    """Registration is disabled — must return 403, not 200."""
    r = client.post("/api/auth/register")
    assert r.status_code == 403


def test_jwt_sub_is_email_not_uuid(client):
    """
    Regression test for the JWT sub/id bug.
    The token's sub claim must be the user's email so that
    auth middleware can look up the user by email.
    """
    import base64, json
    r = client.post("/api/auth/login", data={"username": "doctor@example.com", "password": "password"})
    token = r.json()["access_token"]
    payload_b64 = token.split(".")[1]
    # Add padding
    payload_b64 += "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.b64decode(payload_b64))
    assert payload["sub"] == "doctor@example.com", (
        f"JWT sub should be email, got: {payload['sub']}"
    )


def test_protected_endpoint_requires_auth(client):
    r = client.get("/api/ai/history")
    assert r.status_code in (401, 403)


def test_protected_endpoint_with_valid_token(client):
    token = get_token(client, "patient@example.com")
    r = client.get("/api/ai/history", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_rbac_patient_cannot_access_audit(client):
    token = get_token(client, "patient@example.com")
    r = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_rbac_super_admin_can_access_audit(client):
    token = get_token(client, "admin@example.com")
    r = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_rbac_doctor_can_access_triage(client):
    token = get_token(client, "doctor@example.com")
    r = client.get("/api/triage/queue", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_rbac_patient_cannot_access_triage(client):
    token = get_token(client, "patient@example.com")
    r = client.get("/api/triage/queue", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
