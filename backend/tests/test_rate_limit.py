"""
Rate limiting tests — verify that /api/auth/login returns 429
after exceeding the 10/minute cap.

The limiter key_func checks TESTING at request time, so we can
toggle it per-test without reloading modules.
"""
import os
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.database import get_db
from tests.conftest import override_get_db


@pytest.fixture
def limited_client():
    """TestClient with rate limiting active (TESTING=false)."""
    app.dependency_overrides[get_db] = override_get_db
    original = os.environ.get("TESTING")
    os.environ["TESTING"] = "false"
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    # Restore
    if original is None:
        os.environ.pop("TESTING", None)
    else:
        os.environ["TESTING"] = original
    app.dependency_overrides.clear()


def test_login_rate_limit_triggers_429(limited_client):
    """
    Regression: /api/auth/login must return 429 after 10 requests/minute.
    Confirms slowapi is wired and active in production mode.
    """
    responses = [
        limited_client.post(
            "/api/auth/login",
            data={"username": "patient@example.com", "password": "password"},
        ).status_code
        for _ in range(12)
    ]
    assert 429 in responses, (
        f"Expected 429 after 12 login attempts, got: {responses}"
    )
