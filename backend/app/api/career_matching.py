from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Student
from app.services.career_matching_engine import (
    calculate_career_match,
    calculate_all_career_matches,
)

router = APIRouter(
    prefix="/api/career-matching",
    tags=["Career Matching"],
)


@router.get("/my-careers")
def get_my_career_recommendations(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    """
    Return ranked AYUSH career recommendations
    for the currently logged-in student.
    """

    student = (
        db.query(Student)
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    try:
        return calculate_all_career_matches(
            db=db,
            student_id=student.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


@router.get("/{career_role_id}")
def get_my_career_match(
    career_role_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    """
    Calculate the current student's compatibility
    with one specific AYUSH career role.
    """

    student = (
        db.query(Student)
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    try:
        return calculate_career_match(
            db=db,
            student_id=student.id,
            career_role_id=career_role_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )