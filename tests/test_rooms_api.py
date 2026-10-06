import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_rooms_endpoint():
    response = client.get("/api/rooms")
    assert response.status_code == 200
    rooms = response.json()
    assert isinstance(rooms, list)
    assert len(rooms) == 50

    # Test floor filtering
    floor4_resp = client.get("/api/rooms?floor=4")
    assert floor4_resp.status_code == 200
    floor4_rooms = floor4_resp.json()
    assert len(floor4_rooms) == 10
    assert all(r["floor"] == 4 for r in floor4_rooms)

    # Test sorting by room_number
    room_numbers = [r["room_number"] for r in floor4_rooms]
    assert room_numbers == sorted(room_numbers)


def test_get_rooms_summary_endpoint():
    response = client.get("/api/rooms/summary")
    assert response.status_code == 200
    data = response.json()

    assert "total" in data
    assert "by_status" in data
    assert "by_floor" in data

    assert data["total"] == 50

    # Ensure all RoomStatus enum values are in by_status
    expected_statuses = [
        "OCCUPIED",
        "DIRTY",
        "CLEANING",
        "MAINTENANCE",
        "INSPECTION",
        "READY",
        "OUT_OF_ORDER",
    ]
    for status_key in expected_statuses:
        assert status_key in data["by_status"]
        assert isinstance(data["by_status"][status_key], int)

    # Check sum of by_status equals total
    status_sum = sum(data["by_status"].values())
    assert status_sum == data["total"]

    # Check floors 1 to 5 each have 10 rooms
    for floor_str in ["1", "2", "3", "4", "5"]:
        assert floor_str in data["by_floor"]
        assert data["by_floor"][floor_str] == 10

    floor_sum = sum(data["by_floor"].values())
    assert floor_sum == data["total"]

    # Check by_floor_status
    assert "by_floor_status" in data
    total_from_floors_status = 0
    for floor_str in ["1", "2", "3", "4", "5"]:
        assert floor_str in data["by_floor_status"]
        floor_status_dict = data["by_floor_status"][floor_str]
        for status_key in expected_statuses:
            assert status_key in floor_status_dict
            assert isinstance(floor_status_dict[status_key], int)
            assert floor_status_dict[status_key] >= 0

        # Status counts for each floor must add up to that floor's room count
        floor_total = sum(floor_status_dict.values())
        assert floor_total == data["by_floor"][floor_str]
        total_from_floors_status += floor_total

    # The sum over all floors equals total
    assert total_from_floors_status == data["total"]
