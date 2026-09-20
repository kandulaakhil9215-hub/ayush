from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.applications import Application
from app.models.identity import Student, User
from app.models.internship_progress import InternshipProgress


router = APIRouter(
    prefix="/api/internship",
    tags=["Internship Progress"],
)


class InternshipEnrollmentCreate(BaseModel):
    mentor_id: int | None = None
    start_date: datetime
    end_date: datetime
    total_tasks: int = Field(default=0, ge=0)


class InternshipProgressUpdate(BaseModel):
    progress_percentage: float = Field(ge=0, le=100)
    tasks_completed: int = Field(ge=0)
    total_tasks: int = Field(ge=0)
    attendance_percentage: float = Field(ge=0, le=100)
    student_notes: str | None = None
    mentor_notes: str | None = None
    status: str | None = None


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


@router.post("/enroll/{application_id}")
def enroll_student(
    application_id: int,
    request: InternshipEnrollmentCreate,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
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

    if application.status != "SELECTED":
        raise HTTPException(
            status_code=400,
            detail="Only selected students can be enrolled into an internship",
        )

    if application.internship_id is None:
        raise HTTPException(
            status_code=400,
            detail="This application is not for an internship",
        )

    if request.end_date <= request.start_date:
        raise HTTPException(
            status_code=400,
            detail="End date must be after start date",
        )

    existing = (
        db.query(InternshipProgress)
        .filter(
            InternshipProgress.application_id == application_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Student is already enrolled in this internship",
        )

    student = (
        db.query(Student)
        .filter(Student.id == application.student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    # Verify that the logged-in industry owns the internship
    from app.models.opportunities import Internship

    internship = (
        db.query(Internship)
        .filter(Internship.id == application.internship_id)
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found",
        )

    if internship.industry_id != current_user.industry_profile.id:
        raise HTTPException(
            status_code=403,
            detail="You do not own this internship",
        )

    if request.mentor_id is not None:
        mentor = (
            db.query(User)
            .filter(
                User.id == request.mentor_id,
                User.is_active.is_(True),
            )
            .first()
        )

        if not mentor:
            raise HTTPException(
                status_code=404,
                detail="Mentor user not found",
            )

        # Fixed: no has_role()
        mentor_roles = {role.name for role in mentor.roles}

        if "FACULTY" not in mentor_roles:
            raise HTTPException(
                status_code=400,
                detail="Selected mentor must have the FACULTY role",
            )

    progress = InternshipProgress(
        application_id=application_id,
        mentor_id=request.mentor_id,
        start_date=request.start_date,
        end_date=request.end_date,
        status="IN_PROGRESS",
        progress_percentage=0.0,
        tasks_completed=0,
        total_tasks=request.total_tasks,
        attendance_percentage=0.0,
    )

    db.add(progress)
    db.commit()
    db.refresh(progress)

    return {
        "message": "Student enrolled in internship successfully",
        "internship_progress_id": progress.id,
        "application_id": application_id,
        "student_id": student.id,
        "status": progress.status,
        "start_date": progress.start_date,
        "end_date": progress.end_date,
        "mentor_id": progress.mentor_id,
        "total_tasks": progress.total_tasks,
    }


@router.get("/my")
def get_my_internship_progress(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = get_student_for_user(
        db,
        current_user.id,
    )

    progress_records = (
        db.query(InternshipProgress)
        .join(
            Application,
            InternshipProgress.application_id == Application.id,
        )
        .filter(Application.student_id == student.id)
        .all()
    )

    results = []

    from app.models.opportunities import Internship

    for progress in progress_records:
        application = progress.application

        internship = (
            db.query(Internship)
            .filter(Internship.id == application.internship_id)
            .first()
        )

        mentor_name = None
        if progress.mentor:
            mentor_name = progress.mentor.full_name

        results.append(
            {
                "internship_progress_id": progress.id,
                "application_id": progress.application_id,
                "internship_id": application.internship_id,
                "internship_title": (
                    internship.title if internship else None
                ),
                "mentor_id": progress.mentor_id,
                "mentor_name": mentor_name,
                "start_date": progress.start_date,
                "end_date": progress.end_date,
                "status": progress.status,
                "progress_percentage": progress.progress_percentage,
                "tasks_completed": progress.tasks_completed,
                "total_tasks": progress.total_tasks,
                "attendance_percentage": progress.attendance_percentage,
                "student_notes": progress.student_notes,
                "mentor_notes": progress.mentor_notes,
            }
        )

    return {
        "student_id": student.id,
        "internships": results,
    }


@router.get("/{progress_id}")
def get_internship_progress(
    progress_id: int,
    current_user=Depends(
        require_roles("STUDENT", "INDUSTRY", "FACULTY")
    ),
    db: Session = Depends(get_db),
):
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

    application = progress.application

    # Fixed: define user_roles before using it
    user_roles = {role.name for role in current_user.roles}

    if "STUDENT" in user_roles:
        student = get_student_for_user(
            db,
            current_user.id,
        )

        if application.student_id != student.id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own internship",
            )

    elif "INDUSTRY" in user_roles:
        from app.models.opportunities import Internship

        internship = (
            db.query(Internship)
            .filter(Internship.id == application.internship_id)
            .first()
        )

        if (
            not internship
            or internship.industry_id
            != current_user.industry_profile.id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not own this internship",
            )

    elif "FACULTY" in user_roles:
        if progress.mentor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned as the mentor for this internship",
            )

    return {
        "internship_progress_id": progress.id,
        "application_id": progress.application_id,
        "mentor_id": progress.mentor_id,
        "start_date": progress.start_date,
        "end_date": progress.end_date,
        "status": progress.status,
        "progress_percentage": progress.progress_percentage,
        "tasks_completed": progress.tasks_completed,
        "total_tasks": progress.total_tasks,
        "attendance_percentage": progress.attendance_percentage,
        "student_notes": progress.student_notes,
        "mentor_notes": progress.mentor_notes,
    }


@router.patch("/{progress_id}")
def update_internship_progress(
    progress_id: int,
    request: InternshipProgressUpdate,
    current_user=Depends(
        require_roles("STUDENT", "INDUSTRY", "FACULTY")
    ),
    db: Session = Depends(get_db),
):
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

    application = progress.application

    # Fixed: define user_roles once
    user_roles = {role.name for role in current_user.roles}

    if "STUDENT" in user_roles:
        student = get_student_for_user(
            db,
            current_user.id,
        )

        if application.student_id != student.id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own internship",
            )

        progress.student_notes = request.student_notes

    elif "INDUSTRY" in user_roles:
        from app.models.opportunities import Internship

        internship = (
            db.query(Internship)
            .filter(Internship.id == application.internship_id)
            .first()
        )

        if (
            not internship
            or internship.industry_id
            != current_user.industry_profile.id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not own this internship",
            )

        progress.mentor_notes = request.mentor_notes

    elif "FACULTY" in user_roles:
        # Faculty can update only internships assigned to them
        if progress.mentor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned as the mentor for this internship",
            )

        progress.mentor_notes = request.mentor_notes

    if request.tasks_completed > request.total_tasks:
        raise HTTPException(
            status_code=400,
            detail="Completed tasks cannot exceed total tasks",
        )

    progress.progress_percentage = request.progress_percentage
    progress.tasks_completed = request.tasks_completed
    progress.total_tasks = request.total_tasks
    progress.attendance_percentage = request.attendance_percentage

    if request.status is not None:
        allowed_statuses = {
            "IN_PROGRESS",
            "COMPLETED",
            "ON_HOLD",
            "CANCELLED",
        }

        if request.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid internship status",
            )

        progress.status = request.status

    db.commit()
    db.refresh(progress)

    return {
        "message": "Internship progress updated successfully",
        "internship_progress_id": progress.id,
        "status": progress.status,
        "progress_percentage": progress.progress_percentage,
        "tasks_completed": progress.tasks_completed,
        "total_tasks": progress.total_tasks,
        "attendance_percentage": progress.attendance_percentage,
    }