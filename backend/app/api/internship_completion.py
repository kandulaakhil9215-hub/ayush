from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.applications import Application
from app.models.identity import Faculty, Student, User
from app.models.internship_completion import InternshipCompletion
from app.models.internship_progress import InternshipProgress
from app.services.notification_service import (
    notify_internship_completion,
)


router = APIRouter(
    prefix="/api/internship/completion",
    tags=["Internship Completion"],
)


class InternshipCompletionCreate(BaseModel):
    mentor_rating: float = Field(..., ge=0, le=5)
    mentor_evaluation: str | None = Field(default=None, max_length=10000)
    student_report: str | None = Field(default=None, max_length=20000)
    skills_demonstrated: str | None = Field(default=None, max_length=5000)
    strengths: str | None = Field(default=None, max_length=5000)
    areas_for_improvement: str | None = Field(default=None, max_length=5000)


class InternshipVerificationRequest(BaseModel):
    verification_notes: str | None = Field(
        default=None,
        max_length=5000,
    )
    certificate_url: str | None = Field(
        default=None,
        max_length=1000,
    )


def get_progress(
    progress_id: int,
    db: Session,
) -> InternshipProgress:
    progress = (
        db.query(InternshipProgress)
        .filter(InternshipProgress.id == progress_id)
        .first()
    )

    if not progress:
        raise HTTPException(
            status_code=404,
            detail="Internship progress record not found",
        )

    return progress


def get_completion(
    progress_id: int,
    db: Session,
) -> InternshipCompletion | None:
    return (
        db.query(InternshipCompletion)
        .filter(
            InternshipCompletion.internship_progress_id == progress_id
        )
        .first()
    )


@router.post("/{progress_id}")
def create_completion(
    progress_id: int,
    request: InternshipCompletionCreate,
    current_user=Depends(
        require_roles("FACULTY", "INDUSTRY")
    ),
    db: Session = Depends(get_db),
):
    """
    Create the final internship completion record.

    Faculty:
        Must be the assigned mentor.

    Industry:
        Must own the internship opportunity.
    """

    progress = get_progress(progress_id, db)

    if progress.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Internship must be marked COMPLETED "
                "before creating the completion record"
            ),
        )

    existing = get_completion(progress_id, db)

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Internship completion record already exists",
        )

    user_roles = {role.name for role in current_user.roles}

    if "FACULTY" in user_roles:
        if progress.mentor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned as the mentor for this internship",
            )

    elif "INDUSTRY" in user_roles:
        application = (
            db.query(Application)
            .filter(
                Application.id == progress.application_id
            )
            .first()
        )

        if not application or not application.internship_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid internship application",
            )

        if not application.internship:
            raise HTTPException(
                status_code=404,
                detail="Internship not found",
            )

        if application.internship.industry_id != current_user.industry_profile.id:
            raise HTTPException(
                status_code=403,
                detail="You do not own this internship",
            )

    completion = InternshipCompletion(
        internship_progress_id=progress.id,
        final_progress_percentage=progress.progress_percentage,
        final_attendance_percentage=progress.attendance_percentage,
        tasks_completed=progress.tasks_completed,
        total_tasks=progress.total_tasks,
        mentor_rating=request.mentor_rating,
        mentor_evaluation=request.mentor_evaluation,
        student_report=request.student_report,
        skills_demonstrated=request.skills_demonstrated,
        strengths=request.strengths,
        areas_for_improvement=request.areas_for_improvement,
        completion_date=datetime.utcnow(),
        verified=False,
    )

    db.add(completion)
    db.commit()
    db.refresh(completion)

    return {
        "message": "Internship completion record created successfully",
        "completion_id": completion.id,
        "internship_progress_id": completion.internship_progress_id,
        "final_progress_percentage": completion.final_progress_percentage,
        "final_attendance_percentage": completion.final_attendance_percentage,
        "tasks_completed": completion.tasks_completed,
        "total_tasks": completion.total_tasks,
        "mentor_rating": completion.mentor_rating,
        "verified": completion.verified,
    }


@router.get("/{progress_id}")
def get_completion_record(
    progress_id: int,
    current_user=Depends(
        require_roles(
            "STUDENT",
            "FACULTY",
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "STATE_ADMIN",
            "NATIONAL_ADMIN",
            "SUPER_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    """
    Get internship completion details.
    """

    progress = get_progress(progress_id, db)

    completion = get_completion(progress_id, db)

    if not completion:
        raise HTTPException(
            status_code=404,
            detail="Internship completion record not found",
        )

    user_roles = {role.name for role in current_user.roles}

    # Student ownership
    if "STUDENT" in user_roles:
        application = (
            db.query(Application)
            .filter(
                Application.id == progress.application_id
            )
            .first()
        )

        student = (
            db.query(Student)
            .filter(
                Student.id == application.student_id
            )
            .first()
            if application
            else None
        )

        if not student or student.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this completion record",
            )

    # Faculty mentor ownership
    elif "FACULTY" in user_roles:
        if progress.mentor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned as the mentor",
            )

    return {
        "completion_id": completion.id,
        "internship_progress_id": completion.internship_progress_id,
        "final_progress_percentage": completion.final_progress_percentage,
        "final_attendance_percentage": completion.final_attendance_percentage,
        "tasks_completed": completion.tasks_completed,
        "total_tasks": completion.total_tasks,
        "mentor_rating": completion.mentor_rating,
        "mentor_evaluation": completion.mentor_evaluation,
        "student_report": completion.student_report,
        "skills_demonstrated": completion.skills_demonstrated,
        "strengths": completion.strengths,
        "areas_for_improvement": completion.areas_for_improvement,
        "completion_date": completion.completion_date,
        "verified": completion.verified,
        "verified_by": completion.verified_by,
        "verification_date": completion.verification_date,
        "verification_notes": completion.verification_notes,
        "certificate_url": completion.certificate_url,
    }


@router.patch("/{progress_id}/verify")
def verify_completion(
    progress_id: int,
    request: InternshipVerificationRequest,
    current_user=Depends(
        require_roles(
            "FACULTY",
            "INSTITUTION_ADMIN",
            "STATE_ADMIN",
            "NATIONAL_ADMIN",
            "SUPER_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    """
    Verify an internship completion record.
    """

    completion = get_completion(progress_id, db)

    if not completion:
        raise HTTPException(
            status_code=404,
            detail="Internship completion record not found",
        )

    progress = get_progress(progress_id, db)

    user_roles = {role.name for role in current_user.roles}

    if "FACULTY" in user_roles:
        if progress.mentor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the assigned mentor can verify this internship",
            )

    if completion.verified:
        raise HTTPException(
            status_code=400,
            detail="Internship completion is already verified",
        )

    completion.verified = True
    completion.verified_by = current_user.id
    completion.verification_date = datetime.utcnow()
    completion.verification_notes = request.verification_notes

    if request.certificate_url:
        completion.certificate_url = request.certificate_url

    db.commit()
    db.refresh(completion)

    # Notify student about internship completion verification
    application = (
        db.query(Application)
        .filter(Application.id == progress.application_id)
        .first()
    )

    if application:
        student = (
            db.query(Student)
            .filter(Student.id == application.student_id)
            .first()
        )

        if student:
            notify_internship_completion(
                db=db,
                user_id=student.user_id,
                completion_id=completion.id,
            )

    return {
        "message": "Internship completion verified successfully",
        "completion_id": completion.id,
        "verified": completion.verified,
        "verified_by": completion.verified_by,
        "verification_date": completion.verification_date,
        "certificate_url": completion.certificate_url,
    }