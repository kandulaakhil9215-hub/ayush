from app.db.database import SessionLocal
from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import AyushSystem, Skill


def seed_career_roles():
    db = SessionLocal()

    try:
        ayurveda = (
            db.query(AyushSystem)
            .filter(AyushSystem.name == "Ayurveda")
            .first()
        )

        if not ayurveda:
            raise ValueError("Ayurveda system not found")

        existing_role = (
            db.query(CareerRole)
            .filter(
                CareerRole.name == "Panchakarma Specialist"
            )
            .first()
        )

        if existing_role:
            print("Panchakarma Specialist already exists")
            return

        role = CareerRole(
            name="Panchakarma Specialist",
            description=(
                "AYUSH clinical role focused on Panchakarma "
                "therapeutic procedures, patient assessment, "
                "and Ayurvedic clinical practice."
            ),
            ayush_system_id=ayurveda.id,
            is_active=True,
        )

        db.add(role)
        db.flush()

        required_skills = {
            "Panchakarma": (75, 1.5),
            "Kayachikitsa": (65, 1.2),
            "Dravyaguna": (60, 1.0),
        }

        for skill_name, (required_score, importance_weight) in required_skills.items():

            skill = (
                db.query(Skill)
                .filter(Skill.name == skill_name)
                .first()
            )

            if not skill:
                raise ValueError(
                    f"Skill not found: {skill_name}"
                )

            role_skill = CareerRoleSkill(
                career_role_id=role.id,
                skill_id=skill.id,
                required_score=required_score,
                importance_weight=importance_weight,
            )

            db.add(role_skill)

        db.commit()

        print("=" * 50)
        print("CAREER ROLE SEED COMPLETED")
        print("=" * 50)
        print(f"Career Role : {role.name}")
        print(f"AYUSH System: {ayurveda.name}")
        print("Required Skills:")
        print("  Panchakarma  : 75")
        print("  Kayachikitsa : 65")
        print("  Dravyaguna   : 60")
        print("=" * 50)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_career_roles()