from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Industry
from app.models.opportunities import Job


router = APIRouter(
    prefix="/api/industry/jobs",
    tags=["Industry Jobs"],
)


class JobCreate(BaseModel):
    title: str
    description: str | None = None
    eligibility: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
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


def job_response(job: Job):
    return {
        "id": job.id,
        "industry_id": job.industry_id,
        "title": job.title,
        "description": job.description,
        "eligibility": job.eligibility,
        "location": job.location,
        "employment_type": job.employment_type,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "application_deadline": job.application_deadline,
        "source_url": job.source_url,
        "official_url": job.official_url,
        "status": job.status,
        "verified": job.verified,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


# ============================================================
# CREATE JOB
# ============================================================

@router.post("")
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    if not payload.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Job title is required",
        )

    if payload.salary_min is not None and payload.salary_min < 0:
        raise HTTPException(
            status_code=400,
            detail="Minimum salary cannot be negative",
        )

    if payload.salary_max is not None and payload.salary_max < 0:
        raise HTTPException(
            status_code=400,
            detail="Maximum salary cannot be negative",
        )

    if (
        payload.salary_min is not None
        and payload.salary_max is not None
        and payload.salary_max < payload.salary_min
    ):
        raise HTTPException(
            status_code=400,
            detail="Maximum salary cannot be less than minimum salary",
        )

    if (
        payload.application_deadline is not None
        and payload.application_deadline <= datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=400,
            detail="Application deadline must be in the future",
        )

    job = Job(
        industry_id=industry.id,
        title=payload.title.strip(),
        description=payload.description,
        eligibility=payload.eligibility,
        location=payload.location,
        employment_type=payload.employment_type,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        application_deadline=payload.application_deadline,
        source_url=payload.source_url,
        official_url=payload.official_url,
        verified=False,
        status="OPEN",
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "message": "Job created successfully",
        "job": job_response(job),
    }


# ============================================================
# GET MY JOBS
# ============================================================

@router.get("/my")
def get_my_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    jobs = (
        db.query(Job)
        .filter(Job.industry_id == industry.id)
        .order_by(Job.created_at.desc())
        .all()
    )

    return {
        "industry_id": industry.id,
        "count": len(jobs),
        "jobs": [
            job_response(job)
            for job in jobs
        ],
    }


# ============================================================
# GET SINGLE OWN JOB
# ============================================================

@router.get("/{job_id}")
def get_my_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_current_industry(db, current_user)

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.industry_id == industry.id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return {
        "job": job_response(job),
    }