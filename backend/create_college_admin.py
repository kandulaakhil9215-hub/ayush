from app.db.database import SessionLocal
from app.models.identity import User, Role, Institution
from app.core.security import hash_password


db = SessionLocal()

try:
    # ---------------------------------------------------------
    # 1. Find INSTITUTION_ADMIN role
    # ---------------------------------------------------------
    role = (
        db.query(Role)
        .filter(Role.name == "INSTITUTION_ADMIN")
        .first()
    )

    if not role:
        print("ERROR: INSTITUTION_ADMIN role not found.")
        raise SystemExit(1)

    # ---------------------------------------------------------
    # 2. Find or create the AYUSH test institution
    # ---------------------------------------------------------
    institution = (
        db.query(Institution)
        .filter(
            Institution.institution_code == "AYUSH-TEST-001"
        )
        .first()
    )

    if not institution:
        institution = Institution(
            name="AYUSH Test Institution",
            institution_code="AYUSH-TEST-001",
            institution_type="AYUSH College",
            state="Andhra Pradesh",
            district="Prakasam",
            city="Ongole",
            is_active=True,
        )

        db.add(institution)
        db.commit()
        db.refresh(institution)

        print("Institution created successfully!")
    else:
        print("Institution already exists.")

    print("Institution ID:", institution.id)
    print("Institution:", institution.name)

    # ---------------------------------------------------------
    # 3. Find or create college admin account
    # ---------------------------------------------------------
    existing_user = (
        db.query(User)
        .filter(User.email == "college@ayush.com")
        .first()
    )

    if existing_user:
        print("College admin account already exists.")
        print("User ID:", existing_user.id)

        # Make sure the existing admin belongs
        # to the correct institution.
        if existing_user.institution_id != institution.id:
            existing_user.institution_id = institution.id
            db.commit()

        print("Institution ID:", existing_user.institution_id)

    else:
        user = User(
            email="college@ayush.com",
            password_hash=hash_password("College@123"),
            full_name="AYUSH Test Institution Admin",
            is_active=True,
            is_verified=True,
            institution_id=institution.id,
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