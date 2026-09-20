from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Faculty, Student
from app.models.skills import (
    Skill,
    StudentSkill,
    SkillVerificationHistory,
)
from app.services.notification_service import notify_skill_verification


router = APIRouter(
    prefix="/api/skill-verification",
    tags=["Skill Verification"],
)


# ============================================================
# SCHEMA
# ============================================================

class SkillVerificationRequest(BaseModel):
    verification_status: str = Field(
        default="VERIFIED",
        min_length=5,
        max_length=30,
    )

    verification_source: str = Field(
        default="FACULTY_REVIEW",
        min_length=2,
        max_length=50,
    )

    verification_notes: str | None = Field(
        default=None,
        max_length=2000,
    )

    rejection_reason: str | None = Field(
        default=None,
        max_length=2000,
    )

    evidence_url: str | None = Field(
        default=None,
        max_length=1000,
    )

    review_due_at: datetime | None = None

    verification_expires_at: datetime | None = None


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_STATUSES = {
    "PENDING",
    "VERIFIED",
    "REJECTED",
    "REVIEW_REQUIRED",
}


# ============================================================
# FACULTY ACCESS CONTROL
# ============================================================

def _faculty_can_access_student(
    current_user,
    student: Student,
    db: Session,
) -> None:

    user_roles = {
        role.name
        for role in current_user.roles
    }

    if (
        "FACULTY" not in user_roles
        and "ACADEMIAN" not in user_roles
    ):
        return

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.user_id == current_user.id
        )
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=403,
            detail="Faculty profile not found",
        )

    if faculty.institution_id != student.institution_id:
        raise HTTPException(
            status_code=403,
            detail=(
                "Faculty can manage students "
                "only from the same institution"
            ),
        )


# ============================================================
# VERIFY / REJECT / REVIEW
# ============================================================

@router.patch(
    "/students/{student_id}/skills/{skill_id}/verify",
)
def verify_student_skill(
    student_id: int,
    skill_id: int,
    request: SkillVerificationRequest | None = None,
    current_user=Depends(
        require_roles(
            "FACULTY",
            "ACADEMIAN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
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

    _faculty_can_access_student(
        current_user,
        student,
        db,
    )

    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id)
        .first()
    )

    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found",
        )

    student_skill = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id == student_id,
            StudentSkill.skill_id == skill_id,
        )
        .first()
    )

    if not student_skill:
        raise HTTPException(
            status_code=404,
            detail="Student skill record not found",
        )

    if student_skill.score is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Skill must be assessed "
                "before it can be verified"
            ),
        )

    payload = request or SkillVerificationRequest()

    verification_status = (
        payload.verification_status.upper()
    )

    if verification_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid verification status. "
                "Use PENDING, VERIFIED, REJECTED, "
                "or REVIEW_REQUIRED."
            ),
        )

    if (
        verification_status == "REJECTED"
        and not payload.rejection_reason
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Rejection reason is required "
                "when rejecting a skill"
            ),
        )

    previous_status = (
        student_skill.verification_status
    )

    # --------------------------------------------------------
    # Update current verification state
    # --------------------------------------------------------

    student_skill.verification_status = (
        verification_status
    )

    student_skill.verification_source = (
        payload.verification_source
    )

    student_skill.verification_notes = (
        payload.verification_notes
    )

    student_skill.rejection_reason = (
        payload.rejection_reason
    )

    student_skill.evidence_url = (
        payload.evidence_url
    )

    student_skill.review_due_at = (
        payload.review_due_at
    )

    student_skill.verification_expires_at = (
        payload.verification_expires_at
    )

    # --------------------------------------------------------
    # Verified state
    # --------------------------------------------------------

    if verification_status == "VERIFIED":

        student_skill.verified = True

        student_skill.verified_by = (
            current_user.id
        )

        student_skill.verified_at = (
            datetime.utcnow()
        )

    else:

        student_skill.verified = False

        student_skill.verified_by = None

        student_skill.verified_at = None

    # --------------------------------------------------------
    # Save history
    # --------------------------------------------------------

    history = SkillVerificationHistory(
        student_skill_id=student_skill.id,
        student_id=student.id,
        skill_id=skill.id,
        verified_by=current_user.id,
        status=verification_status,
        score=student_skill.score,
        verification_source=(
            student_skill.verification_source
        ),
        verification_notes=(
            student_skill.verification_notes
        ),
        rejection_reason=(
            student_skill.rejection_reason
        ),
        evidence_url=(
            student_skill.evidence_url
        ),
        review_due_at=(
            student_skill.review_due_at
        ),
        verification_expires_at=(
            student_skill.verification_expires_at
        ),
    )

    db.add(history)

    db.commit()

    db.refresh(student_skill)

    # --------------------------------------------------------
    # Notification
    # --------------------------------------------------------

    try:
        notify_skill_verification(
            db=db,
            user_id=student.user_id,
            skill_id=skill.id,
            skill_name=skill.name,
        )
    except Exception:
        # Verification should remain successful
        # even if notification fails.
        pass

    return {
        "message": (
            "Student skill verification "
            "updated successfully"
        ),
        "student_id": student.id,
        "skill_id": skill.id,
        "skill_name": skill.name,
        "score": student_skill.score,
        "previous_status": previous_status,
        "verification_status": (
            student_skill.verification_status
        ),
        "verified": student_skill.verified,
        "verified_by": student_skill.verified_by,
        "verified_at": student_skill.verified_at,
        "verification_source": (
            student_skill.verification_source
        ),
        "verification_notes": (
            student_skill.verification_notes
        ),
        "rejection_reason": (
            student_skill.rejection_reason
        ),
        "evidence_url": (
            student_skill.evidence_url
        ),
        "review_due_at": (
            student_skill.review_due_at
        ),
        "verification_expires_at": (
            student_skill.verification_expires_at
        ),
    }


# ============================================================
# FACULTY VERIFICATION QUEUE
# ============================================================

@router.get("/faculty/queue")
def get_faculty_verification_queue(
    status: str | None = None,
    current_user=Depends(
        require_roles(
            "FACULTY",
            "ACADEMIAN",
        )
    ),
    db: Session = Depends(get_db),
):

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.user_id == current_user.id
        )
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=403,
            detail="Faculty profile not found",
        )

    query = (
        db.query(StudentSkill)
        .join(
            Student,
            Student.id == StudentSkill.student_id,
        )
        .options(
            joinedload(StudentSkill.skill),
            joinedload(StudentSkill.verifier),
        )
        .filter(
            Student.institution_id
            == faculty.institution_id
        )
        .filter(
            StudentSkill.score.isnot(None)
        )
    )

    if status:

        normalized = status.upper()

        if normalized not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid verification status",
            )

        query = query.filter(
            StudentSkill.verification_status
            == normalized
        )

    else:

        query = query.filter(
            StudentSkill.verification_status.in_(
                [
                    "PENDING",
                    "REVIEW_REQUIRED",
                    "REJECTED",
                ]
            )
        )

    rows = (
        query
        .order_by(StudentSkill.id.desc())
        .all()
    )

    result = []

    for row in rows:

        student = row.student if hasattr(
            row,
            "student",
        ) else None

        result.append(
            {
                "student_skill_id": row.id,
                "student_id": row.student_id,
                "skill_id": row.skill_id,
                "skill_name": (
                    row.skill.name
                    if row.skill
                    else None
                ),
                "score": row.score,
                "verification_status": (
                    row.verification_status
                ),
                "verified": row.verified,
                "verified_by": row.verified_by,
                "verified_at": row.verified_at,
                "verification_source": (
                    row.verification_source
                ),
                "verification_notes": (
                    row.verification_notes
                ),
                "rejection_reason": (
                    row.rejection_reason
                ),
                "evidence_url": row.evidence_url,
                "review_due_at": (
                    row.review_due_at
                ),
                "verification_expires_at": (
                    row.verification_expires_at
                ),
                "student_name": (
                    student.user.full_name
                    if student
                    and student.user
                    else None
                ),
                "student_code": (
                    student.student_id
                    if student
                    else None
                ),
                "department": (
                    student.department
                    if student
                    else None
                ),
                "degree": (
                    student.degree
                    if student
                    else None
                ),
            }
        )

    return {
        "count": len(result),
        "items": result,
    }


# ============================================================
# VERIFICATION HISTORY
# ============================================================

@router.get("/faculty/history")
def get_faculty_verification_history(
    student_id: int | None = None,
    skill_id: int | None = None,
    current_user=Depends(
        require_roles(
            "FACULTY",
            "ACADEMIAN",
        )
    ),
    db: Session = Depends(get_db),
):

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.user_id == current_user.id
        )
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=403,
            detail="Faculty profile not found",
        )

    query = (
        db.query(SkillVerificationHistory)
        .join(
            Student,
            Student.id
            == SkillVerificationHistory.student_id,
        )
        .options(
            joinedload(
                SkillVerificationHistory.verifier
            ),
            joinedload(
                SkillVerificationHistory.student_skill
            ),
        )
        .filter(
            Student.institution_id
            == faculty.institution_id
        )
    )

    if student_id is not None:

        query = query.filter(
            SkillVerificationHistory.student_id
            == student_id
        )

    if skill_id is not None:

        query = query.filter(
            SkillVerificationHistory.skill_id
            == skill_id
        )

    rows = (
        query
        .order_by(
            SkillVerificationHistory.created_at.desc()
        )
        .limit(500)
        .all()
    )

    result = []

    for row in rows:

        student = (
            db.query(Student)
            .filter(Student.id == row.student_id)
            .first()
        )

        skill = (
            db.query(Skill)
            .filter(Skill.id == row.skill_id)
            .first()
        )

        result.append(
            {
                "id": row.id,
                "student_skill_id": (
                    row.student_skill_id
                ),
                "student_id": row.student_id,
                "student_name": (
                    student.user.full_name
                    if student
                    and student.user
                    else None
                ),
                "student_code": (
                    student.student_id
                    if student
                    else None
                ),
                "skill_id": row.skill_id,
                "skill_name": (
                    skill.name
                    if skill
                    else None
                ),
                "status": row.status,
                "score": row.score,
                "verified_by": row.verified_by,
                "verifier_name": (
                    row.verifier.full_name
                    if row.verifier
                    else None
                ),
                "verification_source": (
                    row.verification_source
                ),
                "verification_notes": (
                    row.verification_notes
                ),
                "rejection_reason": (
                    row.rejection_reason
                ),
                "evidence_url": row.evidence_url,
                "review_due_at": (
                    row.review_due_at
                ),
                "verification_expires_at": (
                    row.verification_expires_at
                ),
                "created_at": row.created_at,
            }
        )

    return {
        "count": len(result),
        "items": result,
    }