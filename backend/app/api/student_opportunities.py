from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_user_id
from app.models.identity import Student
from app.services.opportunity_matching_engine import (
    calculate_all_opportunity_matches,
)


router = APIRouter(
    prefix="/api/student/opportunities",
    tags=["Student Opportunities"],
)


@router.get("/recommended")
def get_recommended_opportunities(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == user_id)
        .first()
    )

    if not student:
        return {
            "student_id": None,
            "student_name": None,
            "total_opportunities_evaluated": 0,
            "recommendations": [],
        }

    result = calculate_all_opportunity_matches(
        db=db,
        student_id=student.id,
    )

    result["student_name"] = student.user.full_name

    return result