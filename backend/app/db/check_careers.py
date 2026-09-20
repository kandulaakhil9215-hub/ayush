from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import Skill


db = SessionLocal()

try:
    roles = db.scalars(
        select(CareerRole).order_by(CareerRole.id)
    ).all()

    print()
    print("========================================")
    print("CAREER ROLES AND REQUIREMENTS")
    print("========================================")

    for role in roles:

        print()
        print(f"{role.id}. {role.name}")

        requirements = (
            db.query(CareerRoleSkill, Skill)
            .join(
                Skill,
                Skill.id == CareerRoleSkill.skill_id
            )
            .filter(
                CareerRoleSkill.career_role_id == role.id
            )
            .all()
        )

        for requirement, skill in requirements:
            print(
                f"   - {skill.name}: "
                f"required={requirement.required_score}, "
                f"weight={requirement.importance_weight}"
            )

    print()
    print("========================================")
    print("CAREER VERIFICATION COMPLETED")
    print("========================================")

finally:
    db.close()