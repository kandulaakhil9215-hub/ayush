from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.applications import (
    Application,
    ApplicationStatusHistory,
)
from app.models.identity import Student, Industry
from app.models.opportunities import Internship, Job
from app.services.opportunity_matching_engine import (
    calculate_opportunity_match,
)
from app.services.eligibility_engine import (
    evaluate_eligibility,
)
from app.services.notification_service import (
    notify_application_status,
)


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


# ---------------------------------------------------------
# REQUEST SCHEMAS
# ---------------------------------------------------------

class ApplicationCreate(BaseModel):
    internship_id: int | None = None
    job_id: int | None = None

    cover_letter: str | None = Field(
        default=None,
        max_length=10000,
    )

    resume_url: str | None = Field(
        default=None,
        max_length=1000,
    )


class ApplicationStatusUpdate(BaseModel):
    status: str
    remarks: str | None = Field(
        default=None,
        max_length=5000,
    )


# ---------------------------------------------------------
# STUDENT PROFILE HELPER
# ---------------------------------------------------------

def get_student_for_user(
    db: Session,
    user_id: int,
) -> Student:

    student = (
        db.query(Student)
        .filter(Student.user_id == user_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    return student


# ---------------------------------------------------------
# APPLY FOR INTERNSHIP / JOB
# ---------------------------------------------------------

@router.post("")
def apply_for_opportunity(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = get_student_for_user(
        db,
        current_user.id,
    )

    # Exactly one opportunity must be selected
    if data.internship_id is None and data.job_id is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either internship_id or job_id",
        )

    if data.internship_id is not None and data.job_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Provide only one of internship_id or job_id",
        )

    # -----------------------------------------------------
    # INTERNSHIP APPLICATION
    # -----------------------------------------------------
    if data.internship_id is not None:
        opportunity_type = "INTERNSHIP"
        opportunity_id = data.internship_id

        internship = (
            db.query(Internship)
            .filter(Internship.id == opportunity_id)
            .first()
        )

        if not internship:
            raise HTTPException(
                status_code=404,
                detail="Internship not found",
            )

        if internship.status != "OPEN":
            raise HTTPException(
                status_code=400,
                detail="This internship is not open for applications",
            )

        existing = (
            db.query(Application)
            .filter(
                Application.student_id == student.id,
                Application.internship_id == internship.id,
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail="You have already applied for this internship",
            )

        # Calculate match + eligibility BEFORE creating application
        match_result = calculate_opportunity_match(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        eligibility_result = evaluate_eligibility(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        application = Application(
            student_id=student.id,
            internship_id=internship.id,
            status="APPLIED",
            cover_letter=data.cover_letter,
            resume_url=data.resume_url,
        )

    # -----------------------------------------------------
    # JOB APPLICATION
    # -----------------------------------------------------
    else:
        opportunity_type = "JOB"
        opportunity_id = data.job_id

        job = (
            db.query(Job)
            .filter(Job.id == opportunity_id)
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job not found",
            )

        if job.status != "OPEN":
            raise HTTPException(
                status_code=400,
                detail="This job is not open for applications",
            )

        existing = (
            db.query(Application)
            .filter(
                Application.student_id == student.id,
                Application.job_id == job.id,
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail="You have already applied for this job",
            )

        # Calculate match + eligibility BEFORE creating application
        match_result = calculate_opportunity_match(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        eligibility_result = evaluate_eligibility(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        application = Application(
            student_id=student.id,
            job_id=job.id,
            status="APPLIED",
            cover_letter=data.cover_letter,
            resume_url=data.resume_url,
        )

    # -----------------------------------------------------
    # SAVE APPLICATION
    # -----------------------------------------------------
    db.add(application)
    db.flush()

    history = ApplicationStatusHistory(
        application_id=application.id,
        old_status=None,
        new_status="APPLIED",
        remarks="Application submitted",
    )

    db.add(history)

    db.commit()
    db.refresh(application)

    return {
        "message": "Application submitted successfully",
        "application_id": application.id,
        "status": application.status,
        "applied_at": application.applied_at,
        "match_result": match_result,
        "eligibility_result": eligibility_result,
    }


# ---------------------------------------------------------
# MY APPLICATIONS
# ---------------------------------------------------------

@router.get("/my")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = get_student_for_user(
        db,
        current_user.id,
    )

    applications = (
        db.query(Application)
        .filter(Application.student_id == student.id)
        .order_by(Application.applied_at.desc())
        .all()
    )

    results = []

    for application in applications:
        opportunity_type = None
        opportunity_id = None
        opportunity_title = None
        organization = None

        if application.internship_id:
            internship = (
                db.query(Internship)
                .filter(Internship.id == application.internship_id)
                .first()
            )

            if internship:
                opportunity_type = "INTERNSHIP"
                opportunity_id = internship.id
                opportunity_title = internship.title

                industry = internship.industry
                if industry:
                    organization = industry.company_name

        elif application.job_id:
            job = (
                db.query(Job)
                .filter(Job.id == application.job_id)
                .first()
            )

            if job:
                opportunity_type = "JOB"
                opportunity_id = job.id
                opportunity_title = job.title

                industry = job.industry
                if industry:
                    organization = industry.company_name

        results.append(
            {
                "application_id": application.id,
                "opportunity_type": opportunity_type,
                "opportunity_id": opportunity_id,
                "opportunity_title": opportunity_title,
                "organization": organization,
                "status": application.status,
                "cover_letter": application.cover_letter,
                "resume_url": application.resume_url,
                "applied_at": application.applied_at,
                "updated_at": application.updated_at,
            }
        )

    return {
        "student_id": student.id,
        "total_applications": len(results),
        "applications": results,
    }


# ---------------------------------------------------------
# APPLICATION DETAILS
# ---------------------------------------------------------

@router.get("/{application_id}")
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = get_student_for_user(
        db,
        current_user.id,
    )

    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.student_id == student.id,
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    history = (
        db.query(ApplicationStatusHistory)
        .filter(
            ApplicationStatusHistory.application_id == application.id
        )
        .order_by(ApplicationStatusHistory.changed_at.asc())
        .all()
    )

    return {
        "application_id": application.id,
        "internship_id": application.internship_id,
        "job_id": application.job_id,
        "status": application.status,
        "cover_letter": application.cover_letter,
        "resume_url": application.resume_url,
        "applied_at": application.applied_at,
        "updated_at": application.updated_at,
        "status_history": [
            {
                "id": item.id,
                "old_status": item.old_status,
                "new_status": item.new_status,
                "remarks": item.remarks,
                "changed_at": item.changed_at,
            }
            for item in history
        ],
    }


# ---------------------------------------------------------
# WITHDRAW APPLICATION
# ---------------------------------------------------------

@router.patch("/{application_id}/withdraw")
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("STUDENT")),
):
    student = get_student_for_user(
        db,
        current_user.id,
    )

    application = (
        db.query(Application)
        .filter(
            Application.id == application_id,
            Application.student_id == student.id,
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    if application.status in {"SELECTED", "REJECTED", "WITHDRAWN"}:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Application cannot be withdrawn "
                f"from status {application.status}"
            ),
        )

    old_status = application.status

    application.status = "WITHDRAWN"
    application.updated_at = datetime.utcnow()

    history = ApplicationStatusHistory(
        application_id=application.id,
        old_status=old_status,
        new_status="WITHDRAWN",
        remarks="Application withdrawn by student",
    )

    db.add(history)
    db.commit()

    return {
        "message": "Application withdrawn successfully",
        "application_id": application.id,
        "status": "WITHDRAWN",
    }


# ---------------------------------------------------------
# INDUSTRY STATUS UPDATE
# ---------------------------------------------------------

@router.patch("/{application_id}/status")
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    allowed_statuses = {
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW_SCHEDULED",
        "SELECTED",
        "REJECTED",
    }

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status",
        )

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

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    owns_application = False

    if application.internship_id:
        internship = (
            db.query(Internship)
            .filter(
                Internship.id == application.internship_id,
                Internship.industry_id == industry.id,
            )
            .first()
        )
        if internship:
            owns_application = True

    elif application.job_id:
        job = (
            db.query(Job)
            .filter(
                Job.id == application.job_id,
                Job.industry_id == industry.id,
            )
            .first()
        )
        if job:
            owns_application = True

    if not owns_application:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to manage this application",
        )

    old_status = application.status

    if old_status in {"SELECTED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail=f"Application is already {old_status}",
        )

    application.status = payload.status
    application.updated_at = datetime.utcnow()

    history = ApplicationStatusHistory(
        application_id=application.id,
        old_status=old_status,
        new_status=payload.status,
        remarks=payload.remarks,
    )

    db.add(history)

    # Notify the student about status change
    student = (
        db.query(Student)
        .filter(Student.id == application.student_id)
        .first()
    )

    if student:
        notify_application_status(
            db=db,
            user_id=student.user_id,
            application_id=application.id,
            status=application.status,
        )

    db.commit()
    db.refresh(application)

    return {
        "message": "Application status updated successfully",
        "application_id": application.id,
        "old_status": old_status,
        "new_status": application.status,
    }