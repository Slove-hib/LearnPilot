import os
import pytest
from fastapi.testclient import TestClient

_test_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tests", "test_learnpilot.db")


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Initialize test database once per session."""
    from database import init_db, reset_db

    # Set AFTER config.py load_dotenv() so it won't be overridden
    os.environ["DATABASE_PATH"] = _test_db_path
    init_db()
    yield
    reset_db()
    if os.path.exists(_test_db_path):
        os.unlink(_test_db_path)


@pytest.fixture
def client():
    """FastAPI test client."""
    from main import app
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Register a test user and return auth headers."""
    client.post("/api/auth/register", json={"username": "testuser", "password": "test1234"})
    res = client.post("/api/auth/login", data={"username": "testuser", "password": "test1234"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
