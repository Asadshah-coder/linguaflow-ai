"""Auth flow: register → login → me, plus failure cases."""
import uuid

from .conftest import auth_headers


def _email():
    return f"t-{uuid.uuid4().hex[:8]}@example.com"


def test_register_and_me(client):
    email = _email()
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"]
    assert body["user"]["email"] == email

    me = client.get("/api/auth/me", headers=auth_headers(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_register_duplicate_email_conflict(client, user_token):
    _, _, email = user_token
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert r.status_code == 409


def test_register_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": _email(), "password": "short"})
    assert r.status_code == 422


def test_register_invalid_email_rejected(client):
    r = client.post("/api/auth/register", json={"email": "not-an-email", "password": "secret123"})
    assert r.status_code == 422


def test_login_success(client, user_token):
    _, _, email = user_token
    r = client.post("/api/auth/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]


def test_login_wrong_password_unauthorized(client, user_token):
    _, _, email = user_token
    r = client.post("/api/auth/login", json={"email": email, "password": "wrongpass"})
    assert r.status_code == 401


def test_login_unknown_user_unauthorized(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "secret123"})
    assert r.status_code == 401


def test_me_without_token_unauthorized(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_bad_token_unauthorized(client):
    assert client.get("/api/auth/me", headers=auth_headers("garbage")).status_code == 401
