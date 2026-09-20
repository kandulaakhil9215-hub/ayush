from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db

from app.services.skill_forecasting_engine import (
    forecast_skill_demand,
    get_future_skill_shortages,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["Skill Forecasting"],
)


@router.get("/skill-forecast")
def skill_forecast(
    periods: int = Query(
        3,
        ge=1,
        le=12,
    ),
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
    return forecast_skill_demand(
        db,
        forecast_periods=periods,
    )


@router.get("/future-skill-shortages")
def future_skill_shortages(
    limit: int = Query(
        10,
        ge=1,
        le=50,
    ),
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
    return get_future_skill_shortages(
        db,
        limit,
    )