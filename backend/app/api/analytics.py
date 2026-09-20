from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db

from app.services.analytics_engine import (
    get_national_analytics,
    get_state_analytics,
    get_institution_analytics,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["Platform Analytics"],
)


@router.get("/national")
def national_analytics(
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
    return get_national_analytics(db)


@router.get("/state/{state}")
def state_analytics(
    state: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
):
    return get_state_analytics(
        db,
        state,
    )


@router.get("/institution/{institution_id}")
def institution_analytics(
    institution_id: int,
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
    result = get_institution_analytics(
        db,
        institution_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Institution not found",
        )

    return result