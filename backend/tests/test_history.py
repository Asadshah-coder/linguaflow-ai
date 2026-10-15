"""History CRUD + per-user isolation + auth guards."""
from .conftest import auth_headers

ENTRY = {
    "source_text": "Hello world",
    "translated_text": "ہیلو ورلڈ",
    "source": "auto",
    "target": "ur",
    "detected_source": "en",
    "provider": "mymemory",
}


def test_history_requires_auth(client):
    assert client.get("/api/history").status_code == 401
    assert client.post("/api/history", json=ENTRY).status_code == 401
    assert client.delete("/api/history").status_code == 401


def test_create_and_list_history(client, user_token):
    token, _, _ = user_token
    h = auth_headers(token)
    r = client.post("/api/history", json=ENTRY, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["source_text"] == "Hello world"
    assert body["detected_source"] == "en"
    assert body["id"]

    listed = client.get("/api/history", headers=h).json()
    assert len(listed) == 1
    assert listed[0]["translated_text"] == "ہیلو ورلڈ"


def test_history_is_per_user(client, user_token):
    token_a, _, _ = user_token
    # second user
    import uuid

    email_b = f"b-{uuid.uuid4().hex[:8]}@example.com"
    rb = client.post("/api/auth/register", json={"email": email_b, "password": "secret123"})
    token_b = rb.json()["access_token"]

    client.post("/api/history", json=ENTRY, headers=auth_headers(token_a))
    assert client.get("/api/history", headers=auth_headers(token_b)).json() == []


def test_delete_entry(client, user_token):
    token, _, _ = user_token
    h = auth_headers(token)
    entry_id = client.post("/api/history", json=ENTRY, headers=h).json()["id"]

    assert client.delete(f"/api/history/{entry_id}", headers=h).status_code == 204
    assert client.get("/api/history", headers=h).json() == []
    # deleting twice → 404
    assert client.delete(f"/api/history/{entry_id}", headers=h).status_code == 404


def test_clear_history(client, user_token):
    token, _, _ = user_token
    h = auth_headers(token)
    client.post("/api/history", json=ENTRY, headers=h)
    client.post("/api/history", json={**ENTRY, "source_text": "Hi"}, headers=h)
    assert len(client.get("/api/history", headers=h).json()) == 2

    assert client.delete("/api/history", headers=h).status_code == 204
    assert client.get("/api/history", headers=h).json() == []


def test_history_validation(client, user_token):
    token, _, _ = user_token
    h = auth_headers(token)
    bad = {**ENTRY, "source_text": ""}
    assert client.post("/api/history", json=bad, headers=h).status_code == 422
