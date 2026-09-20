from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Industry, Student, User
from app.models.applications import Application
from app.models.opportunities import Internship, Job
from app.models.skills import StudentSkill
from app.models.consent import Consent


router = APIRouter(
    prefix="/api/industry",
    tags=["Industry Verified Skills"],
)


@router.get("/applications/{application_id}/verified-skills")
def get_verified_student_skills(
    application_id: int,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # 1. Find industry profile
    # ---------------------------------------------------------
    industry = (
        db.query(Industry)
        .filter(Industry.user_id == current_user.id)
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=403,
            detail="Industry profile not found",
        )

    # ---------------------------------------------------------
    # 2. Find application
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 3. Find opportunity
    # ---------------------------------------------------------
    opportunity = None
    opportunity_type = None

    if application.internship_id is not None:
        opportunity_type = "INTERNSHIP"

        opportunity = (
            db.query(Internship)
            .filter(
                Internship.id == application.internship_id
            )
            .first()
        )

    elif application.job_id is not None:
        opportunity_type = "JOB"

        opportunity = (
            db.query(Job)
            .filter(
                Job.id == application.job_id
            )
            .first()
        )

    if not opportunity:
        raise HTTPException(
            status_code=404,
            detail="Opportunity not found",
        )

    # ---------------------------------------------------------
    # 4. Security: industry can only view its own applicants
    # ---------------------------------------------------------
    if opportunity.industry_id != industry.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view this candidate",
        )

    # ---------------------------------------------------------
    # 5. Find student
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 6. PRIVACY CHECK
    # Industry can see verified skills only if the student
    # has granted active VERIFIED_SKILLS consent.
    # ---------------------------------------------------------
    consent = (
        db.query(Consent)
        .filter(
            Consent.student_id == student.id,
            Consent.industry_id == industry.id,
            Consent.purpose == "VERIFIED_SKILLS",
            Consent.granted.is_(True),
            Consent.revoked_at.is_(None),
        )
        .first()
    )

    if not consent:
        raise HTTPException(
            status_code=403,
            detail=(
                "Student consent is required to view "
                "verified skills"
            ),
        )

    # ---------------------------------------------------------
    # 7. Get verified skills
    # ---------------------------------------------------------
    student_skills = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id == student.id,
            StudentSkill.verified.is_(True),
            StudentSkill.score.isnot(None),
        )
        .all()
    )

    verified_skills = []

    for student_skill in student_skills:
        skill = student_skill.skill

        verifier = None

        if student_skill.verified_by:
            verifier = (
                db.query(User)
                .filter(
                    User.id == student_skill.verified_by
                )
                .first()
            )

        verifier_role = None

        if verifier:
            verifier_role = next(
                (
                    role.name
                    for role in verifier.roles
                ),
                None,
            )

        verified_skills.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "category": (
                    skill.category.name
                    if skill.category
                    else None
                ),
                "ayush_system": (
                    skill.category.ayush_system.name
                    if skill.category
                    and skill.category.ayush_system
                    else None
                ),
                "score": student_skill.score,
                "level": (
                    student_skill.level.name
                    if student_skill.level
                    else None
                ),
                "verified": student_skill.verified,
                "verification": {
                    "verified_by": {
                        "user_id": (
                            verifier.id
                            if verifier
                            else None
                        ),
                        "name": (
                            verifier.full_name
                            if verifier
                            else None
                        ),
                        "role": verifier_role,
                    },
                    "verified_at": student_skill.verified_at,
                    "source": (
                        student_skill.verification_source
                    ),
                    "notes": (
                        student_skill.verification_notes
                    ),
                },
            }
        )

    # ---------------------------------------------------------
    # 8. Return verified skills
    # ---------------------------------------------------------
    return {
        "application_id": application.id,
        "opportunity_type": opportunity_type,
        "opportunity_id": opportunity.id,
        "student_id": student.id,
        "consent": {
            "granted": consent.granted,
            "purpose": consent.purpose,
            "granted_at": consent.granted_at,
        },
        "verified_skill_count": len(verified_skills),
        "verified_skills": verified_skills,
    }