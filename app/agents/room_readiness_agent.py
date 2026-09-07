from typing import Any, Union
from app.models.checkout_event import CheckoutEvent
from app.models.enums import GuestType, RoomStatus
from app.models.room_readiness_result import RoomReadinessResult
from app.repositories.mock_hotel_repository import MockHotelRepository
from app.repositories.postgres_hotel_repository import PostgresHotelRepository


class RoomReadinessAgent:
    def __init__(self, repository: Union[MockHotelRepository, PostgresHotelRepository, Any]):
        self.repository = repository
        self.activity_logs = []

    def evaluate_checkout(self, event: CheckoutEvent) -> RoomReadinessResult:
        room = self.repository.get_room_by_id(event.room_id)
        if not room:
            raise ValueError(f"Room with ID {event.room_id} not found.")

        # Accept RoomStatus enum or string value
        room_status_str = room.status.value if hasattr(room.status, "value") else str(room.status)
        if room_status_str != RoomStatus.OCCUPIED.value:
            raise ValueError(
                f"Room {event.room_id} must be in OCCUPIED status to process checkout, but is {room_status_str}."
            )

        next_reservation = self.repository.get_next_reservation_for_room(
            room_id=event.room_id, after_time=event.checkout_time
        )
        if next_reservation:
            next_guest = self.repository.get_guest_by_id(next_reservation.guest_id)
            if not next_guest:
                raise ValueError(
                    f"Guest with ID {next_reservation.guest_id} not found."
                )
        else:
            next_guest = None

        if next_reservation:
            # Handle naive vs timezone-aware check_in_time
            check_in_time = next_reservation.check_in_time.replace(tzinfo=None) if next_reservation.check_in_time.tzinfo else next_reservation.check_in_time
            checkout_time = event.checkout_time.replace(tzinfo=None) if event.checkout_time.tzinfo else event.checkout_time
            hours = (check_in_time - checkout_time).total_seconds() / 3600.0
            if hours < 0:
                raise ValueError("Next reservation check-in time cannot be before checkout time.")
            hours_until_arrival = hours
        else:
            hours_until_arrival = None

        priority_score = 10
        if next_guest and next_guest.guest_type == GuestType.VIP:
            priority_score += 40

        if next_reservation and next_reservation.early_check_in_requested:
            priority_score += 30

        if hours_until_arrival is not None:
            if hours_until_arrival <= 2:
                priority_score += 30
            elif hours_until_arrival <= 4:
                priority_score += 20
            elif hours_until_arrival <= 8:
                priority_score += 10

        if priority_score > 100:
            priority_score = 100

        if priority_score >= 80:
            priority_level = "CRITICAL"
        elif priority_score >= 50:
            priority_level = "HIGH"
        elif priority_score >= 25:
            priority_level = "MEDIUM"
        else:
            priority_level = "NORMAL"

        previous_status = room_status_str
        self.repository.update_room_status(room_id=event.room_id, new_status=RoomStatus.DIRTY)
        new_status = RoomStatus.DIRTY.value

        result = RoomReadinessResult(
            event_id=event.event_id,
            room_id=event.room_id,
            previous_status=previous_status,
            new_status=new_status,
            next_reservation_id=next_reservation.id if next_reservation else None,
            next_guest_id=next_guest.id if next_guest else None,
            next_guest_type=next_guest.guest_type.value if next_guest else None,
            early_check_in_requested=next_reservation.early_check_in_requested if next_reservation else False,
            hours_until_arrival=hours_until_arrival,
            priority_score=priority_score,
            priority_level=priority_level,
            next_agent="HOUSEKEEPING_AGENT",
            status="READY_FOR_HOUSEKEEPING",
            reason=f"Evaluated room readiness: priority level {priority_level} with score {priority_score}.",
        )

        log_entry = {
            "agent": "ROOM_READINESS_AGENT",
            "event_id": event.event_id,
            "action": "EVALUATE_CHECKOUT",
            "room_id": event.room_id,
            "previous_status": previous_status,
            "new_status": new_status,
            "priority_score": priority_score,
            "priority_level": priority_level,
            "next_agent": "HOUSEKEEPING_AGENT",
            "status": "COMPLETED",
        }
        self.activity_logs.append(log_entry)
        return result
