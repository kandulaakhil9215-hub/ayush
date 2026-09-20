from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Student
from app.services.career_path_engine import generate_career_path


router = APIRouter(
    prefix="/api/career-path",
    tags=["Career Path"],
)


@router.get("/my")
def get_my_career_paths(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
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

    # Generate paths for every active career role
    from app.models.career import CareerRole

    career_roles = (
        db.query(CareerRole)
        .filter(CareerRole.is_active.is_(True))
        .all()
    )

    paths = []

    for career_role in career_roles:
        try:
            path = generate_career_path(
                db=db,
                student_id=student.id,
                career_role_id=career_role.id,
            )
            paths.append(path)
        except ValueError:
            continue

    paths.sort(
        key=lambda item: (
            item["readiness"]["percentage"],
            -item["readiness"]["gap_skill_count"],
            -item["readiness"]["not_assessed_skill_count"],
        ),
        reverse=True,
    )

    return {
        "student_id": student.id,
        "student_name": student.user.full_name,
        "career_path_count": len(paths),
        "career_paths": paths,
    }


@router.get("/{career_role_id}")
def get_my_career_path(
    career_role_id: int,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
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
        return generate_career_path(
            db=db,
            student_id=student.id,
            career_role_id=career_role_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )