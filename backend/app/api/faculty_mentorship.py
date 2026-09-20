from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Faculty, Student
from app.models.internship_progress import InternshipProgress
from app.models.applications import Application
from app.models.opportunities import Internship


router = APIRouter(
    prefix="/api/faculty/mentorship",
    tags=["Faculty Mentorship"],
)


@router.get("/my-internships")
def get_my_mentored_internships(
    current_user=Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    faculty = (
        db.query(Faculty)
        .filter(Faculty.user_id == current_user.id)
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty profile not found",
        )

    progress_records = (
        db.query(InternshipProgress)
        .filter(
            InternshipProgress.mentor_id == current_user.id
        )
        .all()
    )

    results = []

    for progress in progress_records:
        application = progress.application

        student = (
            db.query(Student)
            .filter(Student.id == application.student_id)
            .first()
        )

        internship = (
            db.query(Internship)
            .filter(
                Internship.id == application.internship_id
            )
            .first()
        )

        results.append(
            {
                "internship_progress_id": progress.id,
                "application_id": progress.application_id,
                "student_id": student.id if student else None,
                "student_name": (
                    student.user.full_name
                    if student and student.user
                    else None
                ),
                "internship_id": (
                    internship.id
                    if internship
                    else None
                ),
                "internship_title": (
                    internship.title
                    if internship
                    else None
                ),
                "status": progress.status,
                "start_date": progress.start_date,
                "end_date": progress.end_date,
                "progress_percentage": progress.progress_percentage,
                "tasks_completed": progress.tasks_completed,
                "total_tasks": progress.total_tasks,
                "attendance_percentage": progress.attendance_percentage,
                "student_notes": progress.student_notes,
                "mentor_notes": progress.mentor_notes,
            }
        )

    return {
        "faculty_id": faculty.id,
        "faculty_name": current_user.full_name,
        "total_mentored_internships": len(results),
        "internships": results,
    }


@router.get("/internship/{progress_id}")
def get_mentored_internship(
    progress_id: int,
    current_user=Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    progress = (
        db.query(InternshipProgress)
        .filter(
            InternshipProgress.id == progress_id,
            InternshipProgress.mentor_id == current_user.id,
        )
        .first()
    )

    if not progress:
        raise HTTPException(
            status_code=404,
            detail="Mentored internship not found",
        )

    application = progress.application

    student = (
        db.query(Student)
        .filter(Student.id == application.student_id)
        .first()
    )

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == application.internship_id
        )
        .first()
    )

    return {
        "internship_progress_id": progress.id,
        "application_id": progress.application_id,
        "student_id": student.id if student else None,
        "student_name": (
            student.user.full_name
            if student and student.user
            else None
        ),
        "internship_id": internship.id if internship else None,
        "internship_title": (
            internship.title
            if internship
            else None
        ),
        "status": progress.status,
        "start_date": progress.start_date,
        "end_date": progress.end_date,
        "progress_percentage": progress.progress_percentage,
        "tasks_completed": progress.tasks_completed,
        "total_tasks": progress.total_tasks,
        "attendance_percentage": progress.attendance_percentage,
        "student_notes": progress.student_notes,
        "mentor_notes": progress.mentor_notes,
    }