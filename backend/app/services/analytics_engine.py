from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.identity import (
    Institution,
    Student,
    Faculty,
    Industry,
)
from app.models.skills import Skill, StudentSkill
from app.models.opportunities import Internship, Job
from app.models.applications import Application

from app.services.skill_demand_engine import (
    calculate_skill_demand,
    get_emerging_skills,
    get_training_requirements,
)


def get_national_analytics(db: Session):

    skill_demand = calculate_skill_demand(db)

    total_institutions = (
        db.query(Institution)
        .filter(Institution.is_active == True)
        .count()
    )

    total_students = db.query(Student).count()

    total_faculty = db.query(Faculty).count()

    total_industries = db.query(Industry).count()

    total_skills = db.query(Skill).count()

    total_assessed_skills = (
        db.query(StudentSkill)
        .filter(StudentSkill.score.isnot(None))
        .count()
    )

    total_internships = (
        db.query(Internship)
        .filter(Internship.status == "OPEN")
        .count()
    )

    total_jobs = (
        db.query(Job)
        .filter(Job.status == "OPEN")
        .count()
    )

    total_applications = db.query(Application).count()

    top_skills = sorted(
        skill_demand["results"],
        key=lambda x: x["demand_score"],
        reverse=True,
    )[:10]

    return {
        "scope": "NATIONAL",

        "overview": {
            "total_institutions": total_institutions,
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_industries": total_industries,
            "total_skills": total_skills,
            "total_assessed_skills": total_assessed_skills,
            "open_internships": total_internships,
            "open_jobs": total_jobs,
            "total_applications": total_applications,
        },

        "top_demanded_skills": top_skills,

        "emerging_skills": get_emerging_skills(
            db,
            limit=10,
        ),

        "training_requirements": get_training_requirements(
            db,
            limit=10,
        ),
    }


def get_state_analytics(
    db: Session,
    state: str,
):

    institutions = (
        db.query(Institution)
        .filter(
            Institution.state == state,
            Institution.is_active == True,
        )
        .all()
    )

    institution_ids = [
        institution.id
        for institution in institutions
    ]

    students = (
        db.query(Student)
        .filter(
            Student.institution_id.in_(
                institution_ids
            )
        )
        .count()
        if institution_ids
        else 0
    )

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.institution_id.in_(
                institution_ids
            )
        )
        .count()
        if institution_ids
        else 0
    )

    return {
        "scope": "STATE",
        "state": state,

        "overview": {
            "institutions": len(institutions),
            "students": students,
            "faculty": faculty,
        },

        "institutions": [
            {
                "id": institution.id,
                "name": institution.name,
                "district": institution.district,
                "city": institution.city,
            }
            for institution in institutions
        ],
    }


def get_institution_analytics(
    db: Session,
    institution_id: int,
):

    institution = (
        db.query(Institution)
        .filter(
            Institution.id == institution_id
        )
        .first()
    )

    if not institution:
        return None

    students = (
        db.query(Student)
        .filter(
            Student.institution_id
            == institution_id
        )
        .all()
    )

    student_ids = [
        student.id
        for student in students
    ]

    faculty_count = (
        db.query(Faculty)
        .filter(
            Faculty.institution_id
            == institution_id
        )
        .count()
    )

    assessed_skills = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id.in_(student_ids),
            StudentSkill.score.isnot(None),
        ).count()
        if student_ids
        else 0
    )

    return {
        "scope": "INSTITUTION",

        "institution": {
            "id": institution.id,
            "name": institution.name,
            "code": institution.institution_code,
            "type": institution.institution_type,
            "state": institution.state,
            "district": institution.district,
            "city": institution.city,
        },

        "overview": {
            "students": len(students),
            "faculty": faculty_count,
            "assessed_skills": assessed_skills,
        },

        "students": [
            {
                "student_id": student.id,
                "student_code": student.student_id,
                "department": student.department,
                "degree": student.degree,
                "graduation_year": student.graduation_year,
                "cgpa": student.cgpa,
            }
            for student in students
        ],
    }