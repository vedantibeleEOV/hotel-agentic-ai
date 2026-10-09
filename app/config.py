import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotel Operations AI"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Current User Configuration for Human Overrides
    CURRENT_USER_NAME: str = "Amit Shah"
    CURRENT_USER_ROLE: str = "MANAGER"

    # Maintenance Operations Targets & Settings
    TARGET_RESOLUTION_MINUTES: int = 45  # assumption: target resolution duration for maintenance operations in minutes
    DEFAULT_SUPERVISOR_NAME: str = "Rahul Deshpande"
    HOTEL_SECURITY_EXTENSION: str = "100"

    # Docker LLM & Provider Configuration
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "llama3.2"
    LLM_BASE_URL: str = "http://localhost:11434/v1"

    # Docker PostgreSQL Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "hotel_operations_db"
    DATABASE_URL: str = ""

    # JWT Authentication Configuration
    JWT_SECRET: str = ""
    JWT_EXPIRE_MINUTES: int = 480
    DEFAULT_USER_PASSWORD: str = "HotelStaff@2026"


    @property
    def sync_database_url(self) -> str:
        """Ensure Database URL uses psycopg2 driver format for SQLAlchemy and contains password."""
        url = self.DATABASE_URL
        password = self.POSTGRES_PASSWORD or "postgres"
        user = self.POSTGRES_USER or "postgres"
        db = self.POSTGRES_DB or "hotel_operations_db"

        if not url:
            url = f"postgresql+psycopg2://{user}:{password}@localhost:5432/{db}"
        else:
            if f"{user}@" in url and f":{password}@" not in url:
                url = url.replace(f"{user}@", f"{user}:{password}@")
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql+psycopg://"):
                url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Named Category to Qualifying Skills Mapping
CATEGORY_SKILLS_MAPPING = {
    "HVAC": ["HVAC", "GENERAL"],
    "PLUMBING": ["PLUMBING", "GENERAL"],
    "ELECTRICAL": ["ELECTRICAL", "GENERAL"],
    "FURNITURE": ["GENERAL"],
    "SAFETY": ["ELECTRICAL", "GENERAL"],
    "GENERAL": ["GENERAL"],
}

# Named Severity Rules Table
# Defines category, triggers/keywords, resulting severity, SLA minutes, and human-readable explanation template.
# All severity rules and safety triggers live in this single table.
SEVERITY_RULES = [
    # 1. Critical Safety Hazards (Applies across all categories: ELECTRICAL sparks, gas leaks, fire, smoke, electric shock)
    {
        "name": "CRITICAL_SAFETY_HAZARD",
        "category": None,
        "triggers": ["gas", "smoke", "fire", "spark", "electric shock", "shock", "explosion"],
        "severity": "CRITICAL",
        "sla_minutes": 15,
        "reason_template": "Safety hazard ('{trigger}') detected. Gas, smoke, spark, and fire issues are always Critical (15-minute SLA).",
    },
    # 2. Critical Safety Hazard: Trapped / Locked-in Guest (Emergency)
    {
        "name": "SAFETY_GUEST_TRAPPED",
        "category": "SAFETY",
        "triggers": ["trapped", "locked inside", "locked in", "stuck inside", "cannot get out", "can't get out"],
        "severity": "CRITICAL",
        "sla_minutes": 15,
        "reason_template": "Guest trapped inside room ('{trigger}') requires emergency response (15-minute SLA).",
    },
    # 3. Plumbing Leaks & Floods
    {
        "name": "PLUMBING_LEAK_OR_FLOOD",
        "category": "PLUMBING",
        "triggers": ["leak", "burst", "flood", "overflow", "clog", "blockage", "choke"],
        "severity": "HIGH",
        "sla_minutes": 30,
        "reason_template": "Water leak ('{trigger}') raises plumbing issues to High (30-minute target SLA).",
    },
    # 4. HVAC Outage / Cooling Breakdown
    {
        "name": "HVAC_COOLING_BREAKDOWN",
        "category": "HVAC",
        "triggers": ["not cooling", "breakdown", "failed", "dead", "compressor", "leak"],
        "severity": "HIGH",
        "sla_minutes": 30,
        "reason_template": "AC cooling failure ('{trigger}') raises HVAC issues to High (30-minute target SLA).",
    },
    # 5. Electrical Hazard / Outage
    {
        "name": "ELECTRICAL_OUTAGE_OR_EXPOSED",
        "category": "ELECTRICAL",
        "triggers": ["outage", "short circuit", "exposed", "burnt", "burning", "power cut", "blackout"],
        "severity": "HIGH",
        "sla_minutes": 30,
        "reason_template": "Electrical defect ('{trigger}') raises electrical issues to High (30-minute target SLA).",
    },
    # 6. Security & Safety Mechanism / Lock / Alarm
    {
        "name": "SAFETY_LOCK_OR_ALARM",
        "category": "SAFETY",
        "triggers": ["lock", "latch", "jammed", "key", "access", "door", "alarm", "detector", "keycard"],
        "severity": "HIGH",
        "sla_minutes": 30,
        "reason_template": "Safety mechanism defect ('{trigger}') raises safety issues to High (30-minute target SLA).",
    },
    # 7. Low Severity / Minor Furniture Issues
    {
        "name": "FURNITURE_COSMETIC_OR_LOOSE",
        "category": "FURNITURE",
        "triggers": ["wobbly", "loose", "scratch", "squeak", "creak", "drawer", "handle", "chair", "desk", "table"],
        "severity": "LOW",
        "sla_minutes": 240,
        "reason_template": "Minor furniture fixture defect ('{trigger}') classified as Low severity (240-minute target SLA).",
    },
    # 8. Low Severity / Minor General Handyman Issues
    {
        "name": "GENERAL_COSMETIC",
        "category": "GENERAL",
        "triggers": ["paint", "scuff", "stain", "touchup", "curtain hook"],
        "severity": "LOW",
        "sla_minutes": 240,
        "reason_template": "Minor cosmetic defect ('{trigger}') classified as Low severity (240-minute target SLA).",
    },
]

# Baseline fallback when no specific trigger matches
BASELINE_SEVERITY_BY_CATEGORY = {
    "SAFETY": ("HIGH", 30, "Safety and security issues default to High (30-minute target SLA)."),
    "PLUMBING": ("MEDIUM", 60, "Standard plumbing repairs default to Medium (60-minute target SLA)."),
    "HVAC": ("MEDIUM", 60, "Standard HVAC repairs default to Medium (60-minute target SLA)."),
    "ELECTRICAL": ("MEDIUM", 60, "Standard electrical repairs default to Medium (60-minute target SLA)."),
    "FURNITURE": ("LOW", 240, "Furniture repairs default to Low (240-minute target SLA)."),
    "GENERAL": ("MEDIUM", 60, "General maintenance repairs default to Medium (60-minute target SLA)."),
}


def get_critical_safety_triggers() -> list[str]:
    """Return all triggers from SEVERITY_RULES that classify an issue as a CRITICAL safety hazard."""
    triggers = []
    for rule in SEVERITY_RULES:
        if rule.get("severity") == "CRITICAL":
            triggers.extend(rule.get("triggers", []))
    return triggers if triggers else ["gas", "smoke", "fire", "spark", "electric shock", "shock", "explosion"]


HOUSEKEEPING_BLOCKING_CATEGORIES = ("HVAC", "PLUMBING", "ELECTRICAL", "SAFETY")

HOUSEKEEPING_NON_BLOCKING_KEYWORDS = [
    "remote", "tv remote", "bulb", "lamp", "light bulb", "flicker", "flickering",
    "loose chair", "wobbly chair", "chair", "table", "drawer", "paint", "scuff",
    "curtain hook", "curtain", "socket cover", "cosmetic", "hanger", "pillow"
]

HOUSEKEEPING_BLOCKING_KEYWORDS = [
    "ac", "a/c", "air condition", "air conditioning", "air conditioner", "heating", "hvac", "thermostat",
    "leak", "water", "flood", "toilet", "shower", "drain", "pipe", "clog", "burst", "sink", "faucet",
    "spark", "fire", "smoke", "gas", "burn", "burning", "shock", "electric shock", "short circuit",
    "blackout", "power cut", "exposed", "lock", "jammed", "door", "keycard", "trapped",
    "bed", "broken bed", "glass", "window", "hazard"
]


def evaluate_blocks_housekeeping(
    category: str,
    severity: str,
    description: str = "",
    is_safety_rule_applied: bool = False,
) -> tuple[bool, str]:
    """
    Determines whether a maintenance issue blocks housekeeping cleaning.
    Returns (blocks: bool, reason: str).
    """
    cat_upper = (category or "").upper()
    sev_upper = (severity or "").upper()
    desc_lower = (description or "").lower()

    # 1. Critical severity or safety rule triggers always block cleaning
    if sev_upper == "CRITICAL" or is_safety_rule_applied:
        return True, "Critical safety issue requires immediate resolution before cleaning"

    # 2. Explicit non-blocking check for minor/cosmetic items
    for nb in HOUSEKEEPING_NON_BLOCKING_KEYWORDS:
        if nb in desc_lower:
            has_major_blocker = any(b in desc_lower for b in ["spark", "fire", "smoke", "flood", "leak", "shock", "burst", "ac", "hvac", "broken bed"])
            if not has_major_blocker and sev_upper in ("LOW", "MEDIUM") and cat_upper in ("FURNITURE", "GENERAL", "ELECTRICAL"):
                return False, f"Minor non-interfering issue ('{nb}') does not block room cleaning"

    # 3. Blocking categories (HVAC, PLUMBING, SAFETY, or High Electrical)
    if cat_upper in ("HVAC", "PLUMBING", "SAFETY"):
        return True, f"{cat_upper} issue affects room readiness and blocks cleaning"

    if cat_upper == "ELECTRICAL" and sev_upper in ("HIGH", "CRITICAL"):
        return True, "High/Critical electrical issue poses safety hazard to housekeeping"

    # 4. Keyword checks for blocking conditions
    for b in HOUSEKEEPING_BLOCKING_KEYWORDS:
        if b in desc_lower:
            return True, f"Issue involves '{b}' which impacts room readiness/safety"

    # 5. Severity-based fallback
    if sev_upper in ("HIGH", "CRITICAL"):
        return True, f"{sev_upper} severity maintenance blocks room readiness"

    return False, "Minor maintenance issue does not prevent room cleaning"




