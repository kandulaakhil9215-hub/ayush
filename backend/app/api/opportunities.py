from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Student
from app.services.opportunity_matching_engine import (
    calculate_all_opportunity_matches,
)

router = APIRouter(
    prefix="/api/opportunities",
    tags=["Opportunities"],
)


@router.get("/my-recommendations")
def get_my_opportunity_recommendations(
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
        return calculate_all_opportunity_matches(
            db=db,
            student_id=student.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )