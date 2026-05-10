from auth import hash_password, verify_password, create_access_token
from jose import jwt
from config import JWT_SECRET_KEY, JWT_ALGORITHM


def test_hash_password():
    hashed = hash_password("mypassword")
    assert hashed != "mypassword"
    assert hashed.startswith("$2b$")


def test_verify_password_correct():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("mypassword")
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token():
    token = create_access_token("testuser")
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    assert payload["sub"] == "testuser"
    assert "exp" in payload


def test_register_and_login(client):
    # Register
    res = client.post("/api/auth/register", json={"username": "newuser", "password": "pass1234"})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "newuser"
    assert "id" in data


def test_register_duplicate(client):
    client.post("/api/auth/register", json={"username": "dupuser", "password": "pass1234"})
    res = client.post("/api/auth/register", json={"username": "dupuser", "password": "pass1234"})
    assert res.status_code == 409


def test_register_short_password(client):
    res = client.post("/api/auth/register", json={"username": "short", "password": "ab"})
    assert res.status_code == 422


def test_login_success(client):
    client.post("/api/auth/register", json={"username": "loginuser", "password": "pass1234"})
    res = client.post("/api/auth/login", data={"username": "loginuser", "password": "pass1234"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={"username": "wrongpw", "password": "pass1234"})
    res = client.post("/api/auth/login", data={"username": "wrongpw", "password": "wrong"})
    assert res.status_code == 401


def test_protected_route_no_token(client):
    res = client.get("/api/goals")
    assert res.status_code == 401


def test_protected_route_invalid_token(client):
    res = client.get("/api/goals", headers={"Authorization": "Bearer invalid"})
    assert res.status_code == 401


def test_protected_route_valid_token(client, auth_headers):
    res = client.get("/api/goals", headers=auth_headers)
    assert res.status_code == 200
