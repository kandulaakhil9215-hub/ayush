from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Student
from app.models.portfolio import Portfolio
from app.models.skills import StudentSkill, SkillLevel
from app.models.assessment import (
    Assessment,
    AssessmentVersion,
    AssessmentAttempt,
    AssessmentResult,
)


router = APIRouter(
    prefix="/api/portfolio",
    tags=["Student Portfolio"],
)


class PortfolioCreate(BaseModel):
    headline: str | None = Field(default=None, max_length=300)
    career_objective: str | None = Field(default=None, max_length=10000)
    bio: str | None = Field(default=None, max_length=10000)
    profile_summary: str | None = Field(default=None, max_length=10000)
    is_public: bool = False


class PortfolioUpdate(BaseModel):
    headline: str | None = Field(default=None, max_length=300)
    career_objective: str | None = Field(default=None, max_length=10000)
    bio: str | None = Field(default=None, max_length=10000)
    profile_summary: str | None = Field(default=None, max_length=10000)
    is_public: bool | None = None


class PortfolioVerificationRequest(BaseModel):
    verification_notes: str | None = Field(
        default=None,
        max_length=5000,
    )


def get_student_for_user(
    current_user,
    db: Session,
) -> Student:
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    return student


def build_portfolio_response(
    portfolio: Portfolio,
    student: Student,
):
    return {
        "portfolio_id": portfolio.id,
        "student_id": student.id,
        "student_name": student.user.full_name,
        "student_email": student.user.email,
        "institution_id": student.institution_id,
        "department": student.department,
        "degree": student.degree,
        "graduation_year": student.graduation_year,
        "cgpa": student.cgpa,
        "headline": portfolio.headline,
        "career_objective": portfolio.career_objective,
        "bio": portfolio.bio,
        "profile_summary": portfolio.profile_summary,
        "is_public": portfolio.is_public,
        "is_verified": portfolio.is_verified,
        "verification_code": portfolio.verification_code,
        "verified_by": portfolio.verified_by,
        "verification_date": portfolio.verification_date,
        "created_at": portfolio.created_at,
        "updated_at": portfolio.updated_at,
    }


@router.post("")
def create_portfolio(
    request: PortfolioCreate,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = get_student_for_user(current_user, db)

    existing = (
        db.query(Portfolio)
        .filter(Portfolio.student_id == student.id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Portfolio already exists for this student",
        )

    portfolio = Portfolio(
        student_id=student.id,
        headline=request.headline,
        career_objective=request.career_objective,
        bio=request.bio,
        profile_summary=request.profile_summary,
        is_public=request.is_public,
        is_verified=False,
    )

    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    return {
        "message": "Student portfolio created successfully",
        **build_portfolio_response(portfolio, student),
    }


@router.get("/my")
def get_my_portfolio(
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
    user_roles = {role.name for role in current_user.roles}

    if "STUDENT" in user_roles:
        student = get_student_for_user(current_user, db)
    else:
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available to students",
        )

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.student_id == student.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    return build_portfolio_response(portfolio, student)
@router.get("/my/skill-passport")
def get_my_skill_passport(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = get_student_for_user(current_user, db)

    # ------------------------------------------------------------
    # CURRENT SKILL PROFILE
    # ------------------------------------------------------------

    student_skills = (
        db.query(StudentSkill)
        .filter(StudentSkill.student_id == student.id)
        .all()
    )

    verified_skills = []
    assessed_skills = []

    for student_skill in student_skills:
        skill = student_skill.skill

        skill_data = {
            "student_skill_id": student_skill.id,
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

            # Verification status
            "verified": student_skill.verified,
            "verification": {
                "verified_by": student_skill.verified_by,
                "verified_at": student_skill.verified_at,
                "source": student_skill.verification_source,
                "notes": student_skill.verification_notes,
            },

            "source": student_skill.source,
            "last_assessed_at": student_skill.last_assessed_at,
        }

        assessed_skills.append(skill_data)

        if student_skill.verified:
            verified_skills.append(skill_data)

    # ------------------------------------------------------------
    # ASSESSMENT HISTORY
    # ------------------------------------------------------------

    attempts = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.student_id == student.id,
            AssessmentAttempt.status == "SUBMITTED",
        )
        .order_by(
            AssessmentAttempt.submitted_at.desc()
        )
        .all()
    )

    assessment_history = []

    for attempt in attempts:
        version = db.get(
            AssessmentVersion,
            attempt.assessment_version_id,
        )

        assessment = (
            db.get(
                Assessment,
                version.assessment_id,
            )
            if version
            else None
        )

        results = (
            db.query(AssessmentResult)
            .filter(
                AssessmentResult.attempt_id == attempt.id
            )
            .all()
        )

        skill_results = []

        for result in results:
            skill = result.skill

            skill_results.append(
                {
                    "skill_id": result.skill_id,
                    "skill_name": (
                        skill.name
                        if skill
                        else None
                    ),
                    "score": result.score,
                    "level": (
                        result.level.name
                        if result.level
                        else None
                    ),
                    "verified": result.verified,
                }
            )

        assessment_history.append(
            {
                "attempt_id": attempt.id,
                "assessment_name": (
                    assessment.name
                    if assessment
                    else None
                ),
                "assessment_type": (
                    assessment.assessment_type
                    if assessment
                    else None
                ),
                "assessment_version": (
                    version.version_number
                    if version
                    else None
                ),
                "started_at": attempt.started_at,
                "submitted_at": attempt.submitted_at,
                "total_score": attempt.total_score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "skills": skill_results,
            }
        )

    # ------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------

    assessed_scores = [
        skill["score"]
        for skill in assessed_skills
        if skill["score"] is not None
    ]

    verified_scores = [
        skill["score"]
        for skill in verified_skills
        if skill["score"] is not None
    ]

    average_assessed_score = (
        round(
            sum(assessed_scores)
            / len(assessed_scores),
            2,
        )
        if assessed_scores
        else 0
    )

    average_verified_score = (
        round(
            sum(verified_scores)
            / len(verified_scores),
            2,
        )
        if verified_scores
        else 0
    )

    # ------------------------------------------------------------
    # FINAL SKILL PASSPORT
    # ------------------------------------------------------------

    return {
        "student_id": student.id,
        "student_name": student.user.full_name,
        "degree": student.degree,
        "department": student.department,
        "passport_status": "ACTIVE",

        "skill_summary": {
            "total_assessed_skills": len(
                assessed_skills
            ),
            "total_verified_skills": len(
                verified_skills
            ),
            "average_assessed_score":
                average_assessed_score,
            "average_verified_score":
                average_verified_score,
        },

        # Skills verified by faculty/admin
        "verified_skills": verified_skills,

        # All assessed skills
        "assessed_skills": assessed_skills,

        # Complete assessment history
        "assessment_history": {
            "total_attempts": len(
                assessment_history
            ),
            "attempts": assessment_history,
        },
    }
@router.patch("/my")
def update_my_portfolio(
    request: PortfolioUpdate,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = get_student_for_user(current_user, db)

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.student_id == student.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    if request.headline is not None:
        portfolio.headline = request.headline

    if request.career_objective is not None:
        portfolio.career_objective = request.career_objective

    if request.bio is not None:
        portfolio.bio = request.bio

    if request.profile_summary is not None:
        portfolio.profile_summary = request.profile_summary

    if request.is_public is not None:
        portfolio.is_public = request.is_public

    db.commit()
    db.refresh(portfolio)

    return {
        "message": "Student portfolio updated successfully",
        **build_portfolio_response(portfolio, student),
    }


@router.get("/{student_id}")
def get_student_portfolio(
    student_id: int,
    current_user=Depends(
        require_roles(
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
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.student_id == student.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    if not portfolio.is_public and not portfolio.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Student portfolio is not publicly available",
        )

    return build_portfolio_response(portfolio, student)


@router.patch("/{student_id}/verify")
def verify_student_portfolio(
    student_id: int,
    request: PortfolioVerificationRequest,
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
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.student_id == student.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    if portfolio.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Portfolio is already verified",
        )

    user_roles = {role.name for role in current_user.roles}

    # Faculty verification requires the faculty member
    # to belong to the same institution as the student.
    if "FACULTY" in user_roles:
        if not current_user.faculty_profile:
            raise HTTPException(
                status_code=403,
                detail="Faculty profile not found",
            )

        if (
            current_user.faculty_profile.institution_id
            != student.institution_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Faculty can only verify students from the same institution",
            )

    portfolio.is_verified = True
    portfolio.verification_code = (
        f"AYUSH-{student.id}-{secrets.token_urlsafe(12)}"
    )
    portfolio.verified_by = current_user.id
    portfolio.verification_date = datetime.utcnow()

    db.commit()
    db.refresh(portfolio)

    return {
        "message": "Student portfolio verified successfully",
        "portfolio_id": portfolio.id,
        "student_id": student.id,
        "is_verified": portfolio.is_verified,
        "verification_code": portfolio.verification_code,
        "verified_by": portfolio.verified_by,
        "verification_date": portfolio.verification_date,
    }