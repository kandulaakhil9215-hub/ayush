from app.db.database import SessionLocal
from app.models.identity import User, Role
from app.core.security import hash_password


db = SessionLocal()

try:
    # Find the INSTITUTION_ADMIN role
    role = db.query(Role).filter(Role.name == "INSTITUTION_ADMIN").first()

    if not role:
        print("ERROR: INSTITUTION_ADMIN role not found.")
        raise SystemExit

    # Check whether the account already exists
    existing_user = (
        db.query(User)
        .filter(User.email == "college@ayush.com")
        .first()
    )

    if existing_user:
        print("College admin account already exists.")
        print("User ID:", existing_user.id)
        print("Institution ID:", existing_user.institution_id)
    else:
        user = User(
            email="college@ayush.com",
            password_hash=hash_password("College@123"),
            full_name="AYUSH Test Institution Admin",
            is_active=True,
            is_verified=True,
            institution_id=2,
        )

        user.roles.append(role)

        db.add(user)
        db.commit()
        db.refresh(user)

        print("College admin created successfully!")
        print("User ID:", user.id)
        print("Email:", user.email)
        print("Institution ID:", user.institution_id)
        print("Role:", role.name)

finally:
    db.close()