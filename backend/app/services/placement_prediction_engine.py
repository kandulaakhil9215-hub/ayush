from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.identity import Student
from app.models.skills import StudentSkill
from app.models.applications import Application
from app.models.internship_progress import InternshipProgress
from app.models.internship_completion import InternshipCompletion
from app.models.portfolio import Portfolio


def predict_student_placement(
    db: Session,
    student_id: int,
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise ValueError("Student not found")

    # ---------------------------------------------------------
    # SKILL SCORE
    # ---------------------------------------------------------

    skills = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id == student_id,
            StudentSkill.score.isnot(None),
        )
        .all()
    )

    if skills:
        average_skill_score = sum(
            skill.score for skill in skills
        ) / len(skills)
    else:
        average_skill_score = 0.0

    # ---------------------------------------------------------
    # VERIFIED SKILLS
    # ---------------------------------------------------------

    verified_skills = sum(
        1
        for skill in skills
        if skill.verified
    )

    verification_score = min(
        verified_skills * 10,
        100,
    )

    # ---------------------------------------------------------
    # CGPA
    # ---------------------------------------------------------

    cgpa = student.cgpa or 0

    cgpa_score = min(
        (cgpa / 10) * 100,
        100,
    )

    # ---------------------------------------------------------
    # INTERNSHIP EXPERIENCE
    # ---------------------------------------------------------

    internship_progress = (
        db.query(InternshipProgress)
        .join(
            Application,
            InternshipProgress.application_id
            == Application.id,
        )
        .filter(
            Application.student_id == student_id,
            InternshipProgress.status == "COMPLETED",
        )
        .all()
    )

    completed_internships = len(
        internship_progress
    )

    internship_score = min(
        completed_internships * 25,
        100,
    )

    # ---------------------------------------------------------
    # PORTFOLIO
    # ---------------------------------------------------------

    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.student_id == student_id
        )
        .first()
    )

    portfolio_score = 100 if portfolio else 0

    # ---------------------------------------------------------
    # APPLICATION EXPERIENCE
    # ---------------------------------------------------------

    application_count = (
        db.query(Application)
        .filter(
            Application.student_id == student_id
        )
        .count()
    )

    application_score = min(
        application_count * 10,
        100,
    )

    # ---------------------------------------------------------
    # FINAL PLACEMENT READINESS
    # ---------------------------------------------------------

    placement_score = (
        average_skill_score * 0.40
        + cgpa_score * 0.15
        + verification_score * 0.15
        + internship_score * 0.15
        + portfolio_score * 0.10
        + application_score * 0.05
    )

    placement_score = round(
        min(max(placement_score, 0), 100),
        2,
    )

    # ---------------------------------------------------------
    # READINESS LEVEL
    # ---------------------------------------------------------

    if placement_score >= 80:
        readiness = "HIGH"

    elif placement_score >= 60:
        readiness = "MEDIUM"

    elif placement_score >= 40:
        readiness = "DEVELOPING"

    else:
        readiness = "LOW"

    # ---------------------------------------------------------
    # EXPLANATION
    # ---------------------------------------------------------

    strengths = []

    if average_skill_score >= 70:
        strengths.append(
            "strong assessed skill performance"
        )

    if verified_skills > 0:
        strengths.append(
            "verified skills"
        )

    if completed_internships > 0:
        strengths.append(
            "completed internship experience"
        )

    if portfolio:
        strengths.append(
            "digital portfolio"
        )

    improvement_areas = []

    if average_skill_score < 60:
        improvement_areas.append(
            "skill development"
        )

    if verified_skills == 0:
        improvement_areas.append(
            "skill verification"
        )

    if completed_internships == 0:
        improvement_areas.append(
            "industry internship experience"
        )

    if not portfolio:
        improvement_areas.append(
            "digital portfolio development"
        )

    return {
        "student_id": student.id,
        "student_name": (
            student.user.full_name
            if student.user
            else None
        ),

        "prediction": {
            "placement_readiness_score":
                placement_score,
            "readiness_level":
                readiness,
        },

        "feature_analysis": {
            "average_skill_score":
                round(average_skill_score, 2),
            "assessed_skill_count":
                len(skills),
            "verified_skill_count":
                verified_skills,
            "cgpa":
                cgpa,
            "completed_internships":
                completed_internships,
            "portfolio_available":
                portfolio is not None,
            "application_count":
                application_count,
        },

        "strengths": strengths,

        "improvement_areas":
            improvement_areas,

        "explanation": (
            "Placement readiness is calculated from "
            "assessed skills, verified skills, academic "
            "performance, internship experience, portfolio "
            "availability and application activity."
        ),
    }


def predict_all_students(
    db: Session,
):
    students = db.query(Student).all()

    predictions = []

    for student in students:
        predictions.append(
            predict_student_placement(
                db,
                student.id,
            )
        )

    predictions.sort(
        key=lambda item: item["prediction"][
            "placement_readiness_score"
        ],
        reverse=True,
    )

    return {
        "total_students": len(predictions),
        "predictions": predictions,
    }