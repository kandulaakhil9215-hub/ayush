from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Industry, Student
from app.models.applications import Application
from app.models.opportunities import Internship, Job
from app.services.opportunity_matching_engine import calculate_opportunity_match
from app.services.recruitment_engine import (
    calculate_applicant_ranking,
)

router = APIRouter(
    prefix="/api/industry/applications",
    tags=["Industry Applications"],
)


@router.get("/my")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    """
    Get applications received by the logged-in industry.
    """

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

    applications = (
        db.query(Application)
        .join(Student, Application.student_id == Student.id)
        .outerjoin(
            Internship,
            Application.internship_id == Internship.id,
        )
        .outerjoin(
            Job,
            Application.job_id == Job.id,
        )
        .filter(
            (Internship.industry_id == industry.id)
            | (Job.industry_id == industry.id)
        )
        .order_by(Application.applied_at.desc())
        .all()
    )

    results = []

    for application in applications:

        student = (
            db.query(Student)
            .filter(Student.id == application.student_id)
            .first()
        )

        if application.internship_id:
            opportunity_type = "INTERNSHIP"
            opportunity_id = application.internship_id
            opportunity_title = (
                application.internship.title
                if hasattr(application, "internship")
                and application.internship
                else None
            )

            internship = (
                db.query(Internship)
                .filter(Internship.id == opportunity_id)
                .first()
            )

            if internship:
                opportunity_title = internship.title

        elif application.job_id:
            opportunity_type = "JOB"
            opportunity_id = application.job_id
            opportunity_title = (
                application.job.title
                if hasattr(application, "job")
                and application.job
                else None
            )

            job = (
                db.query(Job)
                .filter(Job.id == opportunity_id)
                .first()
            )

            if job:
                opportunity_title = job.title

        else:
            continue

        try:
            match_data = calculate_opportunity_match(
                db=db,
                student_id=application.student_id,
                opportunity_type=opportunity_type,
                opportunity_id=opportunity_id,
            )
        except ValueError:
            match_data = None

        results.append(
            {
                "application_id": application.id,
                "student_id": student.id if student else None,
                "student_name": (
                    student.user.full_name
                    if student
                    and student.user
                    else None
                ),
                "opportunity_type": opportunity_type,
                "opportunity_id": opportunity_id,
                "opportunity_title": opportunity_title,
                "status": application.status,
                "cover_letter": application.cover_letter,
                "resume_url": application.resume_url,
                "applied_at": application.applied_at,
                "updated_at": application.updated_at,
                "match": match_data,
            }
        )

    return {
        "industry_id": industry.id,
        "organization": industry.company_name,
        "total_applications": len(results),
        "applications": results,
    }

@router.get("/opportunity/{opportunity_type}/{opportunity_id}")
def get_ranked_applicants(
    opportunity_type: str,
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = (
        db.query(Industry)
        .filter(
            Industry.user_id == current_user.id
        )
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=404,
            detail="Industry profile not found",
        )

    opportunity_type = opportunity_type.upper()

    if opportunity_type not in {
        "INTERNSHIP",
        "JOB",
    }:
        raise HTTPException(
            status_code=400,
            detail="Opportunity type must be INTERNSHIP or JOB",
        )

    try:
        return calculate_applicant_ranking(
            db=db,
            industry_id=industry.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )