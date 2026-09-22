from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.identity import User, Role
from app.core.security import hash_password


ADMIN_EMAIL = "admin@ayush.com"
ADMIN_PASSWORD = "Admin@123"
ADMIN_NAME = "AYUSH Platform Administrator"


def seed_admin():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # FIND SUPER ADMIN ROLE
        # ---------------------------------------------------------

        role = db.scalar(
            select(Role).where(
                Role.name == "SUPER_ADMIN"
            )
        )

        # Create role if it does not exist
        if not role:
            role = Role(
                name="SUPER_ADMIN",
                description="Full platform administration access",
            )

            db.add(role)
            db.flush()

        # ---------------------------------------------------------
        # FIND ADMIN USER
        # ---------------------------------------------------------

        user = db.scalar(
            select(User).where(
                User.email == ADMIN_EMAIL
            )
        )

        # ---------------------------------------------------------
        # CREATE ADMIN IF NOT FOUND
        # ---------------------------------------------------------

        if not user:
            user = User(
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_NAME,
                is_active=True,
                is_verified=True,
            )

            user.roles.append(role)

            db.add(user)

            print("ADMIN USER CREATED")
        else:
            # Make sure the existing user has the SUPER_ADMIN role
            if role not in user.roles:
                user.roles.append(role)

            # Reset password so the known login works
            user.password_hash = hash_password(ADMIN_PASSWORD)
            user.is_active = True
            user.is_verified = True

            print("ADMIN USER ALREADY EXISTS - PASSWORD/ROLE UPDATED")

        db.commit()

        print("=" * 55)
        print("AYUSH ADMIN SEED COMPLETED")
        print("=" * 55)
        print(f"Email : {ADMIN_EMAIL}")
        print(f"Role  : {role.name}")
        print("=" * 55)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()