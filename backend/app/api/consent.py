from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.consent import Consent
from app.models.identity import Industry, Student


router = APIRouter(
    prefix="/api/consent",
    tags=["Consent"],
)


class ConsentRequest(BaseModel):
    industry_id: int
    purpose: str = "VERIFIED_SKILLS"


@router.post("/grant")
def grant_consent(
    request: ConsentRequest,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
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

    industry = (
        db.query(Industry)
        .filter(
            Industry.id == request.industry_id,
        )
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=404,
            detail="Industry not found",
        )

    consent = (
        db.query(Consent)
        .filter(
            Consent.student_id == student.id,
            Consent.industry_id == industry.id,
            Consent.purpose == request.purpose,
        )
        .first()
    )

    if consent:
        consent.granted = True
        consent.granted_at = datetime.utcnow()
        consent.revoked_at = None
    else:
        consent = Consent(
            student_id=student.id,
            industry_id=industry.id,
            purpose=request.purpose,
            granted=True,
            granted_at=datetime.utcnow(),
        )

        db.add(consent)

    db.commit()
    db.refresh(consent)

    return {
        "message": "Consent granted successfully",
        "consent_id": consent.id,
        "student_id": student.id,
        "industry_id": industry.id,
        "purpose": consent.purpose,
        "granted": consent.granted,
        "granted_at": consent.granted_at,
    }


@router.patch("/revoke/{industry_id}")
def revoke_consent(
    industry_id: int,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
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

    consent = (
        db.query(Consent)
        .filter(
            Consent.student_id == student.id,
            Consent.industry_id == industry_id,
            Consent.purpose == "VERIFIED_SKILLS",
        )
        .first()
    )

    if not consent:
        raise HTTPException(
            status_code=404,
            detail="Consent not found",
        )

    consent.granted = False
    consent.revoked_at = datetime.utcnow()

    db.commit()
    db.refresh(consent)

    return {
        "message": "Consent revoked successfully",
        "consent_id": consent.id,
        "student_id": student.id,
        "industry_id": industry_id,
        "purpose": consent.purpose,
        "granted": consent.granted,
        "revoked_at": consent.revoked_at,
    }


@router.get("/my")
def get_my_consents(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
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

    consents = (
        db.query(Consent)
        .filter(Consent.student_id == student.id)
        .all()
    )

    return {
        "student_id": student.id,
        "consents": [
            {
                "consent_id": consent.id,
                "industry_id": consent.industry_id,
                "purpose": consent.purpose,
                "granted": consent.granted,
                "granted_at": consent.granted_at,
                "revoked_at": consent.revoked_at,
            }
            for consent in consents
        ],
    }