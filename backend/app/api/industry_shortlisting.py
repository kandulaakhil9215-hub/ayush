from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.services.shortlisting_engine import automatically_shortlist
from app.services.notification_service import notify_shortlisted
from app.models.applications import Application
from app.models.identity import Student


router = APIRouter(
    prefix="/api/industry/recruitment",
    tags=["Industry Recruitment"],
)


@router.post("/shortlist/{opportunity_type}/{opportunity_id}")
def automatic_shortlist(
    opportunity_type: str,
    opportunity_id: int,
    minimum_score: float = 60.0,
    minimum_skill_match: float = 60.0,
    minimum_coverage: float = 50.0,
    maximum_candidates: int = 10,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    opportunity_type = opportunity_type.upper()

    if opportunity_type not in {"INTERNSHIP", "JOB"}:
        raise HTTPException(
            status_code=400,
            detail="Opportunity type must be INTERNSHIP or JOB",
        )

    if minimum_score < 0 or minimum_score > 100:
        raise HTTPException(
            status_code=400,
            detail="minimum_score must be between 0 and 100",
        )

    if minimum_skill_match < 0 or minimum_skill_match > 100:
        raise HTTPException(
            status_code=400,
            detail="minimum_skill_match must be between 0 and 100",
        )

    if minimum_coverage < 0 or minimum_coverage > 100:
        raise HTTPException(
            status_code=400,
            detail="minimum_coverage must be between 0 and 100",
        )

    if maximum_candidates < 1:
        raise HTTPException(
            status_code=400,
            detail="maximum_candidates must be at least 1",
        )

    try:
        result = automatically_shortlist(
            db=db,
            industry_user_id=current_user.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
            minimum_score=minimum_score,
            minimum_skill_match=minimum_skill_match,
            minimum_coverage=minimum_coverage,
            maximum_candidates=maximum_candidates,
        )

        # Notify each successfully shortlisted candidate
        shortlisted_items = (
            result.get("shortlisted")
            or result.get("candidates")
            or result.get("applications")
            or []
        )

        for item in shortlisted_items:
            application_id = (
                item.get("application_id")
                if isinstance(item, dict)
                else getattr(item, "application_id", None)
            )

            if not application_id:
                continue

            application = (
                db.query(Application)
                .filter(Application.id == application_id)
                .first()
            )

            if not application:
                continue

            student = (
                db.query(Student)
                .filter(Student.id == application.student_id)
                .first()
            )

            if not student:
                continue

            notify_shortlisted(
                db=db,
                user_id=student.user_id,
                application_id=application.id,
            )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )