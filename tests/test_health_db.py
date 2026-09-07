import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db

client = TestClient(app)


def test_health_db_success():
    """Verify /health/db returns HTTP 200 when database connection is working."""
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    # Ensure credentials are not exposed
    assert "password" not in str(data).lower()


def test_health_db_failure_handling():
    """Verify /health/db returns HTTP 503 when database query fails."""
    class MockBrokenSession:
        def execute(self, *args, **kwargs):
            raise Exception("Database connection timeout")

        def close(self):
            pass

    def mock_broken_get_db():
        yield MockBrokenSession()

    app.dependency_overrides[get_db] = mock_broken_get_db
    try:
        response = client.get("/health/db")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert data["detail"] == "Database connection failed"
        # Ensure credentials are not exposed
        assert "password" not in str(data).lower()
    finally:
        app.dependency_overrides.clear()


def test_existing_health_endpoints():
    """Verify existing health endpoints continue to work."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "online"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"
