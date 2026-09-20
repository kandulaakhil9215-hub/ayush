from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Student
from app.services.skill_gap_engine import calculate_skill_gap


router = APIRouter(
    prefix="/api/skill-gaps",
    tags=["Skill Gaps"],
)


@router.post("/calculate/{career_role_id}")
def calculate_my_skill_gap(
    career_role_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    try:
        result = calculate_skill_gap(
            db=db,
            student_id=student.id,
            career_role_id=career_role_id,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


@router.get("/my-gaps/{career_role_id}")
def get_my_skill_gap(
    career_role_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    from app.models.skill_gap import SkillGap
    from app.models.career import CareerRole
    from app.models.skills import Skill

    career_role = (
        db.query(CareerRole)
        .filter(CareerRole.id == career_role_id)
        .first()
    )

    if not career_role:
        raise HTTPException(
            status_code=404,
            detail="Career role not found",
        )

    gaps = (
        db.query(SkillGap, Skill)
        .join(
            Skill,
            Skill.id == SkillGap.skill_id,
        )
        .filter(
            SkillGap.student_id == student.id,
            SkillGap.career_role_id == career_role_id,
        )
        .all()
    )

    return {
        "student_id": student.id,
        "career_role_id": career_role_id,
        "career_role": career_role.name,
        "skills": [
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "current_score": gap.current_score,
                "required_score": gap.required_score,
                "gap_score": gap.gap_score,
                "severity": gap.severity,
            }
            for gap, skill in gaps
        ],
    }