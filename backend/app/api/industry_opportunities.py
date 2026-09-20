from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Industry
from app.models.opportunities import Internship
from datetime import datetime, timezone

router = APIRouter(
    prefix="/api/industry/opportunities",
    tags=["Industry Opportunities"],
)


class InternshipCreate(BaseModel):
    title: str
    description: str | None = None
    eligibility: str | None = None
    location: str | None = None
    duration: str | None = None
    stipend: float | None = None
    application_deadline: datetime | None = None
    source_url: str | None = None
    official_url: str | None = None


def get_current_industry(
    db: Session,
    current_user,
):
    industry = (
        db.query(Industry)
        .filter(Industry.user_id == current_user.id)
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=404,
            detail="Industry profile not found",
        )

    return industry


def internship_response(internship: Internship):
    return {
        "id": internship.id,
        "industry_id": internship.industry_id,
        "title": internship.title,
        "description": internship.description,
        "eligibility": internship.eligibility,
        "location": internship.location,
        "duration": internship.duration,
        "stipend": internship.stipend,
        "application_deadline": internship.application_deadline,
        "source_url": internship.source_url,
        "official_url": internship.official_url,
        "verified": internship.verified,
        "status": internship.status,
        "created_at": internship.created_at,
        "updated_at": internship.updated_at,
    }


# ============================================================
# CREATE INTERNSHIP
# ============================================================

@router.post("/internships")
def create_internship(
    payload: InternshipCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    if not payload.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Internship title is required",
        )

    if payload.stipend is not None and payload.stipend < 0:
        raise HTTPException(
            status_code=400,
            detail="Stipend cannot be negative",
        )

    if (
        payload.application_deadline
            and payload.application_deadline <= datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=400,
            detail="Application deadline must be in the future",
        )

    internship = Internship(
        industry_id=industry.id,
        title=payload.title.strip(),
        description=payload.description,
        eligibility=payload.eligibility,
        location=payload.location,
        duration=payload.duration,
        stipend=payload.stipend,
        application_deadline=payload.application_deadline,
        source_url=payload.source_url,
        official_url=payload.official_url,
        verified=False,
        status="OPEN",
    )

    db.add(internship)
    db.commit()
    db.refresh(internship)

    return {
        "message": "Internship created successfully",
        "internship": internship_response(internship),
    }


# ============================================================
# GET MY INTERNSHIPS
# ============================================================

@router.get("/internships/my")
def get_my_internships(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    internships = (
        db.query(Internship)
        .filter(Internship.industry_id == industry.id)
        .order_by(Internship.created_at.desc())
        .all()
    )

    return {
        "industry_id": industry.id,
        "count": len(internships),
        "internships": [
            internship_response(internship)
            for internship in internships
        ],
    }


# ============================================================
# GET SINGLE OWN INTERNSHIP
# ============================================================

@router.get("/internships/{internship_id}")
def get_my_internship(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id,
            Internship.industry_id == industry.id,
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found",
        )

    return {
        "internship": internship_response(internship),
    }