from sqlalchemy.orm import Session

from app.models.opportunities import Internship, Job, OpportunitySkill
from app.models.skills import StudentSkill


def calculate_opportunity_match(
    db: Session,
    student_id: int,
    opportunity_type: str,
    opportunity_id: int,
):
    opportunity_type = opportunity_type.upper()

    if opportunity_type == "INTERNSHIP":
        opportunity = (
            db.query(Internship)
            .filter(
                Internship.id == opportunity_id,
                Internship.status == "OPEN",
            )
            .first()
        )

    elif opportunity_type == "JOB":
        opportunity = (
            db.query(Job)
            .filter(
                Job.id == opportunity_id,
                Job.status == "OPEN",
            )
            .first()
        )

    else:
        raise ValueError("Invalid opportunity type")

    if not opportunity:
        raise ValueError("Opportunity not found or not open")

    if opportunity_type == "INTERNSHIP":
        requirements = (
            db.query(OpportunitySkill)
            .filter(
                OpportunitySkill.internship_id == opportunity_id
            )
            .all()
        )
    else:
        requirements = (
            db.query(OpportunitySkill)
            .filter(
                OpportunitySkill.job_id == opportunity_id
            )
            .all()
        )

    matched_skills = []
    skill_gaps = []
    not_assessed_skills = []

    weighted_match_total = 0.0
    weighted_assessed_total = 0.0
    total_weight = 0.0

    for requirement in requirements:
        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id == requirement.skill_id,
            )
            .first()
        )

        required_score = requirement.required_score
        weight = requirement.importance_weight or 1.0

        total_weight += weight

        if (
            student_skill is None
            or student_skill.score is None
        ):
            skill_data = {
                "skill_id": requirement.skill_id,
                "current_score": None,
                "required_score": required_score,
                "gap_score": None,
                "importance_weight": weight,
                "match_percentage": None,
                "eligible": False,
                "skill_status": "NOT_ASSESSED",
            }

            not_assessed_skills.append(skill_data)

            # Not assessed does NOT mean skill score is zero.
            continue

        current_score = student_skill.score

        match_percentage = min(
            (current_score / required_score) * 100
            if required_score > 0
            else 100,
            100,
        )

        gap_score = max(
            required_score - current_score,
            0,
        )

        skill_eligible = current_score >= required_score

        skill_data = {
            "skill_id": requirement.skill_id,
            "current_score": current_score,
            "required_score": required_score,
            "gap_score": gap_score,
            "importance_weight": weight,
            "match_percentage": round(match_percentage, 2),
            "eligible": skill_eligible,
            "skill_status": "ASSESSED",
        }

        weighted_match_total += (
            match_percentage * weight
        )

        weighted_assessed_total += weight

        if skill_eligible:
            matched_skills.append(skill_data)
        else:
            skill_gaps.append(skill_data)

    # Match among ALL required skills.
    if total_weight > 0:
        overall_match_percentage = (
            weighted_match_total / total_weight
        )
    else:
        overall_match_percentage = 0

    # Match among ONLY assessed skills.
    if weighted_assessed_total > 0:
        assessed_skill_match_percentage = (
            weighted_match_total / weighted_assessed_total
        )
    else:
        assessed_skill_match_percentage = 0

    if total_weight > 0:
        assessment_coverage_percentage = (
            weighted_assessed_total / total_weight
        ) * 100
    else:
        assessment_coverage_percentage = 0

    eligible = (
        len(skill_gaps) == 0
        and len(not_assessed_skills) == 0
        and len(requirements) > 0
    )

    if eligible:
        eligibility_reason = "All required skills assessed and requirements satisfied"
    elif skill_gaps:
        eligibility_reason = "One or more assessed skills are below the required score"
    elif not_assessed_skills:
        eligibility_reason = "Required skill assessment pending"
    else:
        eligibility_reason = "No required skills configured"

    return {
        "opportunity_type": opportunity_type,
        "opportunity_id": opportunity.id,
        "title": opportunity.title,

        "overall_match_percentage": round(
            overall_match_percentage,
            2,
        ),

        "assessed_skill_match_percentage": round(
            assessed_skill_match_percentage,
            2,
        ),

        "assessment_coverage_percentage": round(
            assessment_coverage_percentage,
            2,
        ),

        "eligible": eligible,

        "eligibility_reason": eligibility_reason,

        "total_required_skill_count": len(requirements),

        "assessed_skill_count": (
            len(matched_skills) + len(skill_gaps)
        ),

        "matched_skill_count": len(matched_skills),

        "skill_gap_count": len(skill_gaps),

        "not_assessed_skill_count": len(
            not_assessed_skills
        ),

        "matched_skills": matched_skills,

        "skill_gaps": skill_gaps,

        "not_assessed_skills": not_assessed_skills,

        "skills": (
            matched_skills
            + skill_gaps
            + not_assessed_skills
        ),
    }


def calculate_all_opportunity_matches(
    db: Session,
    student_id: int,
):
    recommendations = []

    internships = (
        db.query(Internship)
        .filter(Internship.status == "OPEN")
        .all()
    )

    jobs = (
        db.query(Job)
        .filter(Job.status == "OPEN")
        .all()
    )

    for internship in internships:
        try:
            result = calculate_opportunity_match(
                db=db,
                student_id=student_id,
                opportunity_type="INTERNSHIP",
                opportunity_id=internship.id,
            )

            recommendations.append(result)

        except ValueError:
            continue

    for job in jobs:
        try:
            result = calculate_opportunity_match(
                db=db,
                student_id=student_id,
                opportunity_type="JOB",
                opportunity_id=job.id,
            )

            recommendations.append(result)

        except ValueError:
            continue

    recommendations.sort(
        key=lambda item: (
            not item["eligible"],
            -item["overall_match_percentage"],
            -item["assessment_coverage_percentage"],
        )
    )

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):
        recommendation["rank"] = index

    return {
        "student_id": student_id,
        "total_opportunities_evaluated": len(
            recommendations
        ),
        "recommendations": recommendations,
    }