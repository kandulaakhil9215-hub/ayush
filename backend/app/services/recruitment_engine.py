from sqlalchemy.orm import Session

from app.models.applications import Application
from app.models.identity import Student
from app.models.opportunities import Internship, Job

from app.services.opportunity_matching_engine import (
    calculate_opportunity_match,
)

from app.services.eligibility_engine import (
    evaluate_eligibility,
)


def calculate_applicant_ranking(
    db: Session,
    industry_id: int,
    opportunity_type: str,
    opportunity_id: int,
):
    """
    Rank applicants for one internship or job.

    Ranking priority:
    1. Eligibility
    2. Assessed skill compatibility
    3. Assessment coverage
    """

    opportunity_type = opportunity_type.upper()

    # -----------------------------------------------------
    # GET OPPORTUNITY + APPLICATIONS
    # -----------------------------------------------------

    if opportunity_type == "INTERNSHIP":

        opportunity = (
            db.query(Internship)
            .filter(
                Internship.id == opportunity_id,
                Internship.industry_id == industry_id,
            )
            .first()
        )

        applications = (
            db.query(Application)
            .filter(
                Application.internship_id == opportunity_id,
            )
            .all()
        )

    elif opportunity_type == "JOB":

        opportunity = (
            db.query(Job)
            .filter(
                Job.id == opportunity_id,
                Job.industry_id == industry_id,
            )
            .first()
        )

        applications = (
            db.query(Application)
            .filter(
                Application.job_id == opportunity_id,
            )
            .all()
        )

    else:
        raise ValueError("Invalid opportunity type")

    if not opportunity:
        raise ValueError(
            "Opportunity not found or not owned by this industry"
        )

    ranked_applicants = []

    # -----------------------------------------------------
    # EVALUATE EVERY APPLICANT
    # -----------------------------------------------------

    for application in applications:

        student = (
            db.query(Student)
            .filter(
                Student.id == application.student_id
            )
            .first()
        )

        if not student:
            continue

        # -------------------------------------------------
        # SKILL MATCH
        # -------------------------------------------------

        match = calculate_opportunity_match(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        # -------------------------------------------------
        # ELIGIBILITY
        # -------------------------------------------------

        eligibility = evaluate_eligibility(
            db=db,
            student_id=student.id,
            opportunity_type=opportunity_type,
            opportunity_id=opportunity_id,
        )

        # -------------------------------------------------
        # ASSESSMENT COVERAGE
        # -------------------------------------------------

        assessment_coverage = match[
            "assessment_coverage_percentage"
        ]

        # -------------------------------------------------
        # IMPORTANT:
        # Use assessed-skill match instead of treating
        # NOT_ASSESSED skills as zero.
        # -------------------------------------------------

        skill_match = match[
            "assessed_skill_match_percentage"
        ]

        # -------------------------------------------------
        # ELIGIBILITY SCORE
        # -------------------------------------------------

        eligibility_score = (
            100
            if eligibility["eligible"]
            else 0
        )

        # -------------------------------------------------
        # RECRUITMENT SCORE
        #
        # 50% Eligibility
        # 40% Assessed Skill Match
        # 10% Assessment Coverage
        # -------------------------------------------------

        recruitment_score = (
            eligibility_score * 0.50
            + skill_match * 0.40
            + assessment_coverage * 0.10
        )

        # -------------------------------------------------
        # ELIGIBILITY REASON
        # -------------------------------------------------

        if eligibility["eligible"]:
            eligibility_reason = (
                "Candidate satisfies all eligibility requirements"
            )

        elif match["skill_gaps"]:
            eligibility_reason = (
                "Candidate has one or more skills below the required score"
            )

        elif match["not_assessed_skills"]:
            eligibility_reason = (
                "Candidate has required skills that have not been assessed"
            )

        else:
            eligibility_reason = (
                "Candidate does not satisfy eligibility requirements"
            )

        # -------------------------------------------------
        # BUILD APPLICANT RESULT
        # -------------------------------------------------

        ranked_applicants.append(
            {
                "application_id": application.id,

                "student_id": student.id,

                "student_name": (
                    student.user.full_name
                    if student.user
                    else None
                ),

                "application_status": application.status,

                "applied_at": application.applied_at,

                # Eligibility
                "eligibility": eligibility["eligible"],

                "eligibility_reason": eligibility_reason,

                # Skill intelligence
                "skill_match_percentage": round(
                    skill_match,
                    2,
                ),

                "assessment_coverage_percentage": round(
                    assessment_coverage,
                    2,
                ),

                # Recruitment score
                "recruitment_score": round(
                    recruitment_score,
                    2,
                ),

                # Skill statistics
                "total_required_skill_count": match[
                    "total_required_skill_count"
                ],

                "assessed_skill_count": match[
                    "assessed_skill_count"
                ],

                "matched_skill_count": match[
                    "matched_skill_count"
                ],

                "skill_gap_count": match[
                    "skill_gap_count"
                ],

                "not_assessed_skill_count": match[
                    "not_assessed_skill_count"
                ],

                # Detailed skill information
                "matched_skills": match[
                    "matched_skills"
                ],

                "skill_gaps": match[
                    "skill_gaps"
                ],

                "not_assessed_skills": match[
                    "not_assessed_skills"
                ],

                # Eligibility engine details
                "eligibility_details": eligibility[
                    "rules"
                ],
            }
        )

    # -----------------------------------------------------
    # RANK APPLICANTS
    #
    # Eligible candidates always come first.
    # Within the same eligibility group:
    #   1. Recruitment score
    #   2. Skill match
    #   3. Assessment coverage
    # -----------------------------------------------------

    ranked_applicants.sort(
        key=lambda applicant: (
            applicant["eligibility"],
            applicant["recruitment_score"],
            applicant["skill_match_percentage"],
            applicant["assessment_coverage_percentage"],
        ),
        reverse=True,
    )

    # -----------------------------------------------------
    # ASSIGN RANK
    # -----------------------------------------------------

    for rank, applicant in enumerate(
        ranked_applicants,
        start=1,
    ):
        applicant["rank"] = rank

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    return {
        "opportunity_type": opportunity_type,
        "opportunity_id": opportunity.id,
        "opportunity_title": opportunity.title,
        "total_applicants": len(ranked_applicants),
        "applicants": ranked_applicants,
    }