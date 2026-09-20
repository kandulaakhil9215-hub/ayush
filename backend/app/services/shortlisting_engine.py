from sqlalchemy.orm import Session

from app.models.applications import Application, ApplicationStatusHistory
from app.models.identity import Industry
from app.models.shortlist import Shortlist
from app.services.recruitment_engine import calculate_applicant_ranking


def automatically_shortlist(
    db: Session,
    industry_user_id: int,
    opportunity_type: str,
    opportunity_id: int,
    minimum_score: float = 60.0,
    minimum_skill_match: float = 60.0,
    minimum_coverage: float = 50.0,
    maximum_candidates: int = 10,
):
    opportunity_type = opportunity_type.upper()

    industry = (
        db.query(Industry)
        .filter(Industry.user_id == industry_user_id)
        .first()
    )

    if not industry:
        raise ValueError("Industry profile not found")

    # Get ranked applicants using the existing recruitment engine
    ranking = calculate_applicant_ranking(
        db=db,
        industry_id=industry.id,
        opportunity_type=opportunity_type,
        opportunity_id=opportunity_id,
    )

    applicants = ranking.get("applicants", [])

    eligible_candidates = []

    for applicant in applicants:

        if applicant["eligibility"] is not True:
            continue

        if applicant["recruitment_score"] < minimum_score:
            continue

        if applicant["skill_match_percentage"] < minimum_skill_match:
            continue

        if applicant["assessment_coverage_percentage"] < minimum_coverage:
            continue

        eligible_candidates.append(applicant)

    # Highest ranked candidates first
    eligible_candidates.sort(
        key=lambda x: (
            x["recruitment_score"],
            x["skill_match_percentage"],
            x["assessment_coverage_percentage"],
        ),
        reverse=True,
    )

    selected_candidates = eligible_candidates[:maximum_candidates]

    created_shortlists = []

    for position, candidate in enumerate(
        selected_candidates,
        start=1,
    ):

        application = (
            db.query(Application)
            .filter(
                Application.id == candidate["application_id"]
            )
            .first()
        )

        if not application:
            continue

        # Do not shortlist withdrawn or rejected applications
        if application.status in {
            "WITHDRAWN",
            "REJECTED",
        }:
            continue

        # Check whether already shortlisted
        existing = (
            db.query(Shortlist)
            .filter(
                Shortlist.application_id
                == application.id
            )
            .first()
        )

        if existing:
            continue

        reason = (
            "Automatically shortlisted based on "
            "eligibility, skill compatibility, "
            "assessment coverage, and recruitment score."
        )

        shortlist = Shortlist(
            application_id=application.id,
            rank=position,
            recruitment_score=candidate[
                "recruitment_score"
            ],
            skill_match_percentage=candidate[
                "skill_match_percentage"
            ],
            assessment_coverage_percentage=candidate[
                "assessment_coverage_percentage"
            ],
            eligibility_status=True,
            shortlist_type="AUTOMATIC",
            reason=reason,
            shortlisted_by=industry_user_id,
        )

        db.add(shortlist)

        old_status = application.status

        application.status = "SHORTLISTED"

        history = ApplicationStatusHistory(
            application_id=application.id,
            old_status=old_status,
            new_status="SHORTLISTED",
            remarks=reason,
        )

        db.add(history)

        created_shortlists.append(
            {
                "application_id": application.id,
                "student_id": candidate["student_id"],
                "student_name": candidate["student_name"],
                "rank": position,
                "recruitment_score": candidate[
                    "recruitment_score"
                ],
                "skill_match_percentage": candidate[
                    "skill_match_percentage"
                ],
                "assessment_coverage_percentage": candidate[
                    "assessment_coverage_percentage"
                ],
            }
        )

    db.commit()

    return {
        "opportunity_type": opportunity_type,
        "opportunity_id": opportunity_id,
        "total_applicants": len(applicants),
        "eligible_candidates": len(
            eligible_candidates
        ),
        "shortlisted_candidates": len(
            created_shortlists
        ),
        "shortlisting_rules": {
            "minimum_score": minimum_score,
            "minimum_skill_match": minimum_skill_match,
            "minimum_assessment_coverage": minimum_coverage,
            "maximum_candidates": maximum_candidates,
        },
        "shortlisted": created_shortlists,
    }