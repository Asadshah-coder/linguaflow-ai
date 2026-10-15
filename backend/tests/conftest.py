"""Pytest fixtures: isolated temp SQLite DB + TestClient with overridden get_db."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point the app at a temp DB *before* importing app modules.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["SECRET_KEY"] = "test-secret-key"

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

test_engine = create_engine(f"sqlite:///{_tmp.name}", connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def _override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = _override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def user_token(client):
    """Register a fresh user, return (token, user_id)."""
    import uuid

    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert r.status_code == 201, r.text
    body = r.json()
    return body["access_token"], body["user"]["id"], email


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
