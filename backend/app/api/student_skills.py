from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Student
from app.models.skills import StudentSkill


router = APIRouter(
    prefix="/api/skills",
    tags=["Student Skills"],
)


def build_student_skill_response(
    db: Session,
    student: Student,
):
    """
    Build the complete skill profile for one student
    using real PostgreSQL data.
    """

    skill_records = (
        db.query(StudentSkill)
        .options(
            joinedload(StudentSkill.skill)
            .joinedload(
                StudentSkill.skill.property.mapper.class_.category
            )
            .joinedload(
                StudentSkill.skill.property.mapper.class_.category
                .property.mapper.class_.ayush_system
            ),
            joinedload(StudentSkill.level),
        )
        .filter(
            StudentSkill.student_id == student.id
        )
        .order_by(StudentSkill.id.asc())
        .all()
    )

    skills = []

    for student_skill in skill_records:

        skill = student_skill.skill

        category = (
            skill.category
            if skill
            else None
        )

        ayush_system = (
            category.ayush_system
            if category
            else None
        )

        score = student_skill.score

        if score is not None:
            skill_status = "ASSESSED"
        else:
            skill_status = "NOT_ASSESSED"

        skills.append(
            {
                "id": skill.id if skill else None,
                "student_skill_id": student_skill.id,
                "name": skill.name if skill else None,
                "category": (
                    category.name
                    if category
                    else None
                ),
                "ayush_system": (
                    ayush_system.name
                    if ayush_system
                    else None
                ),
                "score": score,
                "skill_level": (
                    student_skill.level.name
                    if student_skill.level
                    else None
                ),
                "verified": bool(
                    student_skill.verified
                ),
                "source": student_skill.source,
                "assessed_at": (
                    student_skill.last_assessed_at
                ),
                "status": skill_status,
            }
        )

    assessed_skills = sum(
        1
        for skill in skills
        if skill["status"] == "ASSESSED"
    )

    verified_skills = sum(
        1
        for skill in skills
        if skill["verified"]
    )

    scores = [
        skill["score"]
        for skill in skills
        if skill["score"] is not None
    ]

    average_score = (
        round(
            sum(scores) / len(scores),
            2,
        )
        if scores
        else None
    )

    return {
        "id": student.id,
        "student_id": student.student_id,

        "name": (
            student.user.full_name
            if student.user
            else None
        ),

        "full_name": (
            student.user.full_name
            if student.user
            else None
        ),

        "email": (
            student.user.email
            if student.user
            else None
        ),

        "degree": student.degree,
        "department": student.department,
        "graduation_year": student.graduation_year,
        "cgpa": student.cgpa,

        "institution": (
            student.institution.name
            if student.institution
            else None
        ),

        "total_skills": len(skills),
        "assessed_skills": assessed_skills,
        "verified_skills": verified_skills,
        "average_score": average_score,

        "skills": skills,
    }


@router.get("/my-skills")
def get_my_skills(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "STUDENT",
        )
    ),
):
    """
    Return the skill profile of the currently logged-in student.

    The student ID is obtained from the authenticated user.
    No student ID is accepted from the frontend.
    """

    student = (
        db.query(Student)
        .options(
            joinedload(Student.user),
            joinedload(Student.institution),
        )
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found.",
        )

    return build_student_skill_response(
        db,
        student,
    )


@router.get("/students")
def get_all_students_with_skills(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "ACADEMIAN",
        )
    ),
):
    """
    Return all students with their real skill records.

    Used by faculty/institution/admin dashboards.
    Data is loaded directly from PostgreSQL.
    """

    students = (
        db.query(Student)
        .options(
            joinedload(Student.user),
            joinedload(Student.institution),
        )
        .order_by(Student.id.asc())
        .all()
    )

    response = []

    for student in students:
        response.append(
            build_student_skill_response(
                db,
                student,
            )
        )

    return {
        "total_students": len(response),
        "students": response,
    }