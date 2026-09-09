import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_checkout_no_body_no_params():
    response = client.post("/checkout-request")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_checkout_url_query_param():
    response = client.post("/checkout-request?query=101")
    assert response.status_code == 200
    assert "101" in response.json()["agent_response"]


def test_checkout_url_room_number_param():
    response = client.post("/checkout-request?room_number=202")
    assert response.status_code == 200
    assert "202" in response.json()["agent_response"]


def test_checkout_json_query():
    response = client.post("/checkout-request", json={"query": "303"})
    assert response.status_code == 200
    assert "303" in response.json()["agent_response"]


def test_checkout_json_room_number():
    response = client.post("/checkout-request", json={"room_number": "404"})
    assert response.status_code == 200
    assert "404" in response.json()["agent_response"]


def test_checkout_empty_json():
    response = client.post("/checkout-request", json={})
    assert response.status_code == 200
    assert "unknown" in response.json()["agent_response"]


def test_api_checkout_valid_event():
    client.post("/api/reset")
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 1,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 202
    data = response.json()
    assert data["message"] == "Checkout event accepted and routed"
    assert data["processing_status"] == "ROUTED"
    assert "room_readiness" in data
    assert "housekeeping" in data
    assert data["housekeeping"]["status"] in ("HOUSEKEEPING_ASSIGNED", "WAITING_FOR_STAFF")



def test_api_checkout_unknown_room():
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 999,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "Room not found"


def test_api_checkout_unknown_reservation():
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 1,
        "reservation_id": 9999,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "Reservation not found"


def test_api_checkout_property_mismatch():
    response = client.post("/api/events/checkout", json={
        "property_id": 2,
        "room_id": 1,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 400
    assert "Property ID does not match" in response.json()["detail"]


def test_api_checkout_reservation_room_mismatch():
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 2,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 400
    assert "Reservation does not belong" in response.json()["detail"]


def test_api_checkout_pydantic_failure():
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 0,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 422


def test_api_checkout_invalid_room_status_conflict():
    client.post("/api/reset")
    # First checkout sets room status to DIRTY -> CLEANING
    client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 1,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    # Second checkout on room 1 (which is now CLEANING) should return 409 Conflict
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 1,
        "reservation_id": 5001,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 409
    assert "must be in OCCUPIED or DIRTY status" in response.json()["detail"]


def test_api_checkout_dirty_room_succeeds():
    client.post("/api/reset")
    # Manually set room 2 status to DIRTY
    client.put("/api/rooms/2/status?new_status=DIRTY")

    # Calling checkout event for room 2 (which is DIRTY) should succeed!
    response = client.post("/api/events/checkout", json={
        "property_id": 1,
        "room_id": 2,
        "reservation_id": 5002,
        "checkout_time": "2026-08-29T10:00:00"
    })
    assert response.status_code == 202
    data = response.json()
    assert data["message"] == "Checkout event accepted and routed"
    assert data["housekeeping"]["new_room_status"] == "CLEANING"
    assert data["housekeeping"]["status"] == "HOUSEKEEPING_ASSIGNED"



