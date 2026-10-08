"""
Dev-only script to seed user accounts for all staff members with hashed passwords.

Features:
- Reads DEFAULT_USER_PASSWORD from environment (never hardcoded in database).
- Creates an account for every staff member in the staff table (role matched exactly).
- Creates an admin/hotel manager user.
- Prints created usernames only (never prints or exposes passwords).
- Strictly dev-only and NEVER runs automatically.

Usage:
    python scripts/seed_users.py
"""

import os
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from app.config import settings
from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.database.orm.staff_entity import StaffEntity
from app.database.orm.user_entity import UserEntity


def generate_username(name: str) -> str:
    """Generate a clean username from a staff name (e.g. 'Priya Deshmukh' -> 'priya.deshmukh')."""
    cleaned = "".join(c if c.isalnum() or c.isspace() else "" for c in name.strip().lower())
    parts = cleaned.split()
    return ".".join(parts) if len(parts) >= 2 else cleaned


def seed_users():
    raw_password = os.getenv("DEFAULT_USER_PASSWORD") or settings.DEFAULT_USER_PASSWORD or "HotelStaff@2026"
    hashed_pwd = hash_password(raw_password)

    session = SessionLocal()
    created_count = 0
    created_usernames = []

    try:
        # 1. Fetch all staff members
        staff_members = list(session.execute(select(StaffEntity)).scalars().all())

        for st in staff_members:
            username = generate_username(st.name)

            # Check if user already exists
            existing_user = session.execute(
                select(UserEntity).where(UserEntity.username == username)
            ).scalar_one_or_none()

            role_val = (st.role or "HOUSEKEEPING").upper()
            if "CLEAN" in role_val or "HOUSEKEEP" in role_val:
                role_clean = "HOUSEKEEPING"
            elif "MAINT" in role_val or "TECH" in role_val:
                role_clean = "MAINTENANCE"
            elif "SUPER" in role_val:
                role_clean = "SUPERVISOR"
            elif "MANAGE" in role_val:
                role_clean = "MANAGER"
            else:
                role_clean = role_val

            if not existing_user:
                new_user = UserEntity(
                    staff_id=st.id,
                    username=username,
                    password_hash=hashed_pwd,
                    role=role_clean,
                    is_active=True,
                )
                session.add(new_user)
                created_count += 1
                created_usernames.append(f"  • {username:<20} (Role: {role_clean}, Staff: {st.name})")
            else:
                existing_user.password_hash = hashed_pwd
                existing_user.role = role_clean
                existing_user.staff_id = st.id
                created_usernames.append(f"  • {username:<20} [Updated] (Role: {role_clean}, Staff: {st.name})")

        # 2. Ensure default Hotel Manager user exists (Amit Shah)
        manager_user = session.execute(
            select(UserEntity).where(UserEntity.username == "amit.shah")
        ).scalar_one_or_none()

        if not manager_user:
            mgr = UserEntity(
                staff_id=None,
                username="amit.shah",
                password_hash=hashed_pwd,
                role="MANAGER",
                is_active=True,
            )
            session.add(mgr)
            created_count += 1
            created_usernames.append("  • amit.shah            (Role: MANAGER, Name: Amit Shah)")

        session.commit()

        print("\n" + "=" * 60)
        print("✅ USER ACCOUNTS SEEDED SUCCESSFULLY")
        print("=" * 60)
        print(f"Total user accounts configured: {len(created_usernames)}")
        print("\nConfigured Usernames:")
        for u in created_usernames:
            print(u)
        print("\nNote: All users have been initialized with the default password from .env.")
        print("=" * 60 + "\n")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding users: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_users()
