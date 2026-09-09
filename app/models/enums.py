from enum import Enum


class RoomStatus(str, Enum):
    OCCUPIED = "OCCUPIED"
    DIRTY = "DIRTY"
    CLEANING = "CLEANING"
    MAINTENANCE = "MAINTENANCE"
    INSPECTION = "INSPECTION"
    READY = "READY"
    OUT_OF_ORDER = "OUT_OF_ORDER"


class GuestType(str, Enum):
    REGULAR = "REGULAR"
    VIP = "VIP"


class EventType(str, Enum):
    GUEST_CHECKED_OUT = "GUEST_CHECKED_OUT"


class StaffRole(str, Enum):
    HOUSEKEEPING = "HOUSEKEEPING"
    MAINTENANCE = "MAINTENANCE"


class TaskType(str, Enum):
    ROOM_CLEANING = "ROOM_CLEANING"
    ROOM_MAINTENANCE = "ROOM_MAINTENANCE"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class MaintenanceCategory(str, Enum):
    HVAC = "HVAC"
    ELECTRICAL = "ELECTRICAL"
    PLUMBING = "PLUMBING"
    FURNITURE = "FURNITURE"
    SAFETY = "SAFETY"
    GENERAL = "GENERAL"


class MaintenanceSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"


class MaintenanceSkill(str, Enum):
    HVAC = "HVAC"
    ELECTRICAL = "ELECTRICAL"
    PLUMBING = "PLUMBING"
    GENERAL = "GENERAL"


class MaintenanceResultStatus(str, Enum):
    MAINTENANCE_ASSIGNED = "MAINTENANCE_ASSIGNED"
    WAITING_FOR_TECHNICIAN = "WAITING_FOR_TECHNICIAN"



