from datetime import datetime

from app.agents.room_readiness_agent import RoomReadinessAgent
from app.models.checkout_event import CheckoutEvent
from app.models.enums import RoomStatus
from app.repositories.postgres_hotel_repository import PostgresHotelRepository

# Initial setup for Test A, B, and F
repository = PostgresHotelRepository()
repository.update_room_status(1, RoomStatus.OCCUPIED)
agent = RoomReadinessAgent(repository)

print("=" * 60)
print("TEST A — VIP + early check-in (expect CRITICAL, score 100)")
print("=" * 60)
event_a = CheckoutEvent(
    property_id=1,
    room_id=1,
    reservation_id=5001,
    checkout_time=datetime(2026, 8, 29, 10, 0),
)
result_a = agent.evaluate_checkout(event_a)
print(result_a)
print("Expected priority_level=CRITICAL, priority_score=100")
print()

print("=" * 60)
print("TEST B — Verify room status changed")
print("=" * 60)
room = repository.get_room_by_id(1)
print(f"Room status: {room.status}")
print("Expected status=DIRTY")
print()

print("=" * 60)
print("TEST C — Unknown room (expect ValueError)")
print("=" * 60)
repo_fresh = PostgresHotelRepository()
agent_fresh = RoomReadinessAgent(repo_fresh)
event_c = CheckoutEvent(
    property_id=1,
    room_id=9999,
    reservation_id=5001,
    checkout_time=datetime(2026, 8, 29, 10, 0),
)
try:
    agent_fresh.evaluate_checkout(event_c)
except ValueError as e:
    print(f"Caught ValueError: {e}")
print()

print("=" * 60)
print("TEST D — Room not OCCUPIED (expect ValueError)")
print("=" * 60)
repo_fresh.update_room_status(room_id=1, new_status=RoomStatus.DIRTY)
event_d = CheckoutEvent(
    property_id=1,
    room_id=1,
    reservation_id=5001,
    checkout_time=datetime(2026, 8, 29, 10, 0),
)
try:
    agent_fresh.evaluate_checkout(event_d)
except ValueError as e:
    print(f"Caught ValueError: {e}")
print()

print("=" * 60)
print("TEST E — No future reservation (expect NORMAL, score 10)")
print("=" * 60)
repo_e = PostgresHotelRepository()
repo_e.update_room_status(1, RoomStatus.OCCUPIED)
agent_e = RoomReadinessAgent(repo_e)
event_e = CheckoutEvent(
    property_id=1,
    room_id=1,
    reservation_id=5001,
    checkout_time=datetime(2026, 9, 1, 12, 0),
)
result_e = agent_e.evaluate_checkout(event_e)
print(result_e)
print("Expected priority_level=NORMAL, priority_score=10, next_reservation_id=None")
print()

print("=" * 60)
print("TEST F — Activity log check")
print("=" * 60)
print(f"Activity logs count: {len(agent.activity_logs)}")
print(f"Activity logs content: {agent.activity_logs}")
print("Expected length=1, action=EVALUATE_CHECKOUT, status=COMPLETED")
