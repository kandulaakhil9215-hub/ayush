from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Student
from app.services.course_recommendation_engine import (
    calculate_course_recommendations,
)


router = APIRouter(
    prefix="/api/student/learning",
    tags=["Learning Recommendations"],
)


@router.get("/recommendations")
def get_learning_recommendations(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        return {
            "student_id": None,
            "recommendation_count": 0,
            "recommendations": [],
        }

    return calculate_course_recommendations(
        student_id=student.id,
        db=db,
    )