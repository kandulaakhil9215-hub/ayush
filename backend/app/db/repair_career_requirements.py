from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import Skill


CAREER_REQUIREMENTS = {
    "Clinical Research Associate - AYUSH": [
        ("Kayachikitsa", 60, 1.0),
        ("Clinical Research", 70, 1.5),
        ("Research Methodology", 70, 1.5),
    ],

    "AYUSH Healthcare Manager": [
        ("AYUSH Hospital Management", 70, 1.5),
        ("Communication", 65, 1.0),
        ("Leadership", 65, 1.2),
    ],
}


def repair_requirements():
    db = SessionLocal()

    try:
        created = 0
        skipped = 0

        for career_name, requirements in CAREER_REQUIREMENTS.items():

            career = db.scalar(
                select(CareerRole).where(
                    CareerRole.name == career_name
                )
            )

            if not career:
                print(f"CAREER NOT FOUND: {career_name}")
                continue

            for skill_name, required_score, weight in requirements:

                skill = db.scalar(
                    select(Skill).where(
                        Skill.name == skill_name
                    )
                )

                if not skill:
                    print(
                        f"SKILL NOT FOUND: {skill_name}"
                    )
                    continue

                existing = db.scalar(
                    select(CareerRoleSkill).where(
                        CareerRoleSkill.career_role_id == career.id,
                        CareerRoleSkill.skill_id == skill.id,
                    )
                )

                if existing:
                    skipped += 1
                    continue

                requirement = CareerRoleSkill(
                    career_role_id=career.id,
                    skill_id=skill.id,
                    required_score=required_score,
                    importance_weight=weight,
                )

                db.add(requirement)
                created += 1

                print(
                    f"ADDED: {career_name} -> "
                    f"{skill_name} ({required_score})"
                )

        db.commit()

        print()
        print("========================================")
        print("CAREER REQUIREMENT REPAIR COMPLETED")
        print("========================================")
        print(f"Requirements added : {created}")
        print(f"Already existed    : {skipped}")
        print("========================================")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    repair_requirements()