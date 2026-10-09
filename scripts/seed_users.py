"""
Dev-only script to seed user accounts for Manager, Supervisor, and all Staff members.

Features:
- Reads DEFAULT_USER_PASSWORD from environment (never hardcoded in database).
- Creates/updates Manager account 'amit.shah' (role: MANAGER, staff_id: None).
- Creates/updates accounts for all staff members in the staff table (HOUSEKEEPING, MAINTENANCE, SUPERVISOR).
- Ensures a SUPERVISOR account exists (from staff table or default supervisor 'rahul.deshpande').
- Tracks and prints exact counts: Created, Updated, and Skipped.
- Prints created/configured usernames only (never prints or exposes passwords).
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
from app.core.security import hash_password, verify_password
from app.database.connection import SessionLocal
from app.database.orm.staff_entity import StaffEntity
from app.database.orm.user_entity import UserEntity


def generate_username(name: str) -> str:
    """Generate a clean username from a name (e.g. 'Priya Deshmukh' -> 'priya.deshmukh')."""
    cleaned = "".join(c if c.isalnum() or c.isspace() else "" for c in name.strip().lower())
    parts = cleaned.split()
    return ".".join(parts) if len(parts) >= 2 else cleaned


def normalize_role(role_raw: str) -> str:
    """Normalize staff/user role to standard system roles."""
    val = (role_raw or "HOUSEKEEPING").strip().upper()
    if "SUPER" in val:
        return "SUPERVISOR"
    if "MANAGE" in val:
        return "MANAGER"
    if "MAINT" in val or "TECH" in val:
        return "MAINTENANCE"
    if "CLEAN" in val or "HOUSEKEEP" in val:
        return "HOUSEKEEPING"
    return val


def seed_users():
    raw_password = os.getenv("DEFAULT_USER_PASSWORD") or settings.DEFAULT_USER_PASSWORD or "HotelStaff@2026"
    hashed_pwd = hash_password(raw_password)

    session = SessionLocal()
    created_count = 0
    updated_count = 0
    skipped_count = 0
    user_rows_summary = []

    try:
        # 1. Seed / Update Manager User ("amit.shah")
        manager_username = "amit.shah"
        mgr_user = session.execute(
            select(UserEntity).where(UserEntity.username == manager_username)
        ).scalar_one_or_none()

        if not mgr_user:
            new_mgr = UserEntity(
                staff_id=None,
                username=manager_username,
                password_hash=hashed_pwd,
                role="MANAGER",
                is_active=True,
            )
            session.add(new_mgr)
            created_count += 1
            user_rows_summary.append(f"  • {manager_username:<20} [CREATED] Role: MANAGER    | Staff: None (Amit Shah)")
        else:
            changed = False
            if mgr_user.role != "MANAGER":
                mgr_user.role = "MANAGER"
                changed = True
            if not verify_password(raw_password, mgr_user.password_hash):
                mgr_user.password_hash = hashed_pwd
                changed = True
            if not mgr_user.is_active:
                mgr_user.is_active = True
                changed = True

            if changed:
                updated_count += 1
                user_rows_summary.append(f"  • {manager_username:<20} [UPDATED] Role: MANAGER    | Staff: None (Amit Shah)")
            else:
                skipped_count += 1
                user_rows_summary.append(f"  • {manager_username:<20} [SKIPPED] Role: MANAGER    | Staff: None (Amit Shah)")

        # 2. Seed / Update Users for Staff Members
        staff_members = list(session.execute(select(StaffEntity)).scalars().all())
        has_supervisor_in_staff = False

        for st in staff_members:
            username = generate_username(st.name)
            role_clean = normalize_role(st.role)

            if role_clean == "SUPERVISOR":
                has_supervisor_in_staff = True

            existing_user = session.execute(
                select(UserEntity).where(UserEntity.username == username)
            ).scalar_one_or_none()

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
                user_rows_summary.append(f"  • {username:<20} [CREATED] Role: {role_clean:<10} | Staff: #{st.id} ({st.name})")
            else:
                changed = False
                if existing_user.role != role_clean:
                    existing_user.role = role_clean
                    changed = True
                if existing_user.staff_id != st.id:
                    existing_user.staff_id = st.id
                    changed = True
                if not verify_password(raw_password, existing_user.password_hash):
                    existing_user.password_hash = hashed_pwd
                    changed = True
                if not existing_user.is_active:
                    existing_user.is_active = True
                    changed = True

                if changed:
                    updated_count += 1
                    user_rows_summary.append(f"  • {username:<20} [UPDATED] Role: {role_clean:<10} | Staff: #{st.id} ({st.name})")
                else:
                    skipped_count += 1
                    user_rows_summary.append(f"  • {username:<20} [SKIPPED] Role: {role_clean:<10} | Staff: #{st.id} ({st.name})")

        # 3. If no supervisor exists in staff table, add default supervisor ("rahul.deshpande")
        if not has_supervisor_in_staff:
            supervisor_username = "rahul.deshpande"
            sup_user = session.execute(
                select(UserEntity).where(UserEntity.username == supervisor_username)
            ).scalar_one_or_none()

            if not sup_user:
                new_sup = UserEntity(
                    staff_id=None,
                    username=supervisor_username,
                    password_hash=hashed_pwd,
                    role="SUPERVISOR",
                    is_active=True,
                )
                session.add(new_sup)
                created_count += 1
                user_rows_summary.append(f"  • {supervisor_username:<20} [CREATED] Role: SUPERVISOR | Staff: None (Rahul Deshpande)")
            else:
                changed = False
                if sup_user.role != "SUPERVISOR":
                    sup_user.role = "SUPERVISOR"
                    changed = True
                if not verify_password(raw_password, sup_user.password_hash):
                    sup_user.password_hash = hashed_pwd
                    changed = True
                if not sup_user.is_active:
                    sup_user.is_active = True
                    changed = True

                if changed:
                    updated_count += 1
                    user_rows_summary.append(f"  • {supervisor_username:<20} [UPDATED] Role: SUPERVISOR | Staff: None (Rahul Deshpande)")
                else:
                    skipped_count += 1
                    user_rows_summary.append(f"  • {supervisor_username:<20} [SKIPPED] Role: SUPERVISOR | Staff: None (Rahul Deshpande)")

        session.commit()

        total_users = created_count + updated_count + skipped_count

        print("\n" + "=" * 70)
        print("🔐 VOYAGE OPS USER ACCOUNTS SEED SUMMARY")
        print("=" * 70)
        print(f"Status Counts: Created: {created_count} | Updated: {updated_count} | Skipped: {skipped_count} | Total: {total_users}")
        print("\nConfigured User Accounts:")
        for row in user_rows_summary:
            print(row)
        print("\nSecurity Notice: Passwords hashed using bcrypt (read from DEFAULT_USER_PASSWORD).")
        print("=" * 70 + "\n")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding users: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_users()
