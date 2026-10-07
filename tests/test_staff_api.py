from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_staff_endpoint():
    """Verify GET /api/staff returns list of hotel staff with id, name, role, and skills."""
    res = client.get("/api/staff")
    assert res.status_code == 200
    staff_list = res.json()
    assert isinstance(staff_list, list)
    assert len(staff_list) >= 4

    # Verify staff structure
    first = staff_list[0]
    assert "id" in first
    assert "name" in first
    assert "role" in first
    assert "assigned_floor" in first
    assert "is_available" in first

    # Verify role filter
    hk_res = client.get("/api/staff?role=HOUSEKEEPING")
    assert hk_res.status_code == 200
    hk_staff = hk_res.json()
    assert all(s["role"] == "HOUSEKEEPING" for s in hk_staff)

    maint_res = client.get("/api/staff?role=MAINTENANCE")
    assert maint_res.status_code == 200
    maint_staff = maint_res.json()
    assert all(s["role"] == "MAINTENANCE" for s in maint_staff)
