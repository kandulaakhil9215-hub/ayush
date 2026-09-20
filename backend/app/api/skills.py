from fastapi import APIRouter, Depends, Query,  HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.services.skill_demand_snapshot_service import (
    save_skill_demand_snapshot,
)
from app.services.skill_demand_engine import (
    calculate_skill_demand,
    get_emerging_skills,
    get_training_requirements,
)

from app.services.skill_demand_snapshot_service import (
    save_skill_demand_snapshot,
    generate_demo_demand_history,
)

router = APIRouter(
    prefix="/api/analytics",
    tags=["Skill Demand Analytics"],
)


@router.get("/skill-demand")
def skill_demand(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "INDUSTRY",
        )
    ),
):
    return calculate_skill_demand(db)


@router.get("/emerging-skills")
def emerging_skills(
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
            "INDUSTRY",
        )
    ),
):
    return get_emerging_skills(
        db,
        limit,
    )


@router.get("/training-requirements")
def training_requirements(
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "INDUSTRY",
        )
    ),
):
    return get_training_requirements(
        db,
        limit,
    )
@router.post("/skill-demand/snapshot")
def create_skill_demand_snapshot(
    period: str,
    db: Session = Depends(get_db),
):
    """
    Generate and store a skill-demand snapshot.

    Period format:
    YYYY-MM
    """

    try:
        return save_skill_demand_snapshot(
            db=db,
            period=period,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
@router.post("/skill-demand/demo-history")
def create_demo_skill_demand_history(
        db: Session = Depends(get_db),
):
        """
        Generate clearly marked demo historical
        skill-demand data for forecasting development.
        """

        return generate_demo_demand_history(db)