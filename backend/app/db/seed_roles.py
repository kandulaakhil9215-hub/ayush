from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.identity import Role


ROLES = [
    {
        "name": "SUPER_ADMIN",
        "description": "Full platform administration access",
    },
    {
        "name": "NATIONAL_ADMIN",
        "description": "National-level AYUSH administration access",
    },
    {
        "name": "STATE_ADMIN",
        "description": "State-level AYUSH administration access",
    },
    {
        "name": "INSTITUTION_ADMIN",
        "description": "Institution-level administration access",
    },
    {
        "name": "FACULTY",
        "description": "AYUSH faculty and academician access",
    },
    {
        "name": "STUDENT",
        "description": "AYUSH student access",
    },
    {
        "name": "INDUSTRY",
        "description": "AYUSH industry and organization access",
    },
    {
        "name": "RESEARCHER",
        "description": "AYUSH research and collaboration access",
    },
    {
        "name": "PRACTITIONER",
        "description": "AYUSH practitioner access",
    },
]


def seed_roles():
    db = SessionLocal()

    try:
        added = 0
        existing = 0

        for role_data in ROLES:

            role = db.scalar(
                select(Role).where(
                    Role.name == role_data["name"]
                )
            )

            if role:
                existing += 1
                continue

            role = Role(
                name=role_data["name"],
                description=role_data["description"],
            )

            db.add(role)
            added += 1

        db.commit()

        print("=" * 50)
        print("PLATFORM ROLES SEEDED SUCCESSFULLY")
        print("=" * 50)
        print(f"Roles added    : {added}")
        print(f"Already existed: {existing}")
        print(f"Total roles    : {len(ROLES)}")
        print("=" * 50)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()