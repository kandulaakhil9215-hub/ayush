from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db

from app.services.placement_prediction_engine import (
    predict_student_placement,
    predict_all_students,
)


router = APIRouter(
    prefix="/api/predictions",
    tags=["Placement Prediction"],
)


@router.get("/student/{student_id}")
def student_prediction(
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "STUDENT",
        )
    ),
):
    try:
        return predict_student_placement(
            db,
            student_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


@router.get("/students")
def all_student_predictions(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
        )
    ),
):
    return predict_all_students(db)