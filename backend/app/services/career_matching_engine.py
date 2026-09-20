from sqlalchemy.orm import Session

from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import StudentSkill, Skill


def calculate_career_match(
    db: Session,
    student_id: int,
    career_role_id: int,
):
    """
    Calculate compatibility between a student and an AYUSH career role.

    The engine distinguishes:
    - assessed skills
    - skill gaps
    - unassessed skills

    This prevents an unassessed skill from being treated
    as an actual score of zero.
    """

    career_role = (
        db.query(CareerRole)
        .filter(
            CareerRole.id == career_role_id,
            CareerRole.is_active.is_(True),
        )
        .first()
    )

    if not career_role:
        raise ValueError("Career role not found")

    requirements = (
        db.query(CareerRoleSkill)
        .filter(
            CareerRoleSkill.career_role_id == career_role_id
        )
        .all()
    )

    if not requirements:
        raise ValueError(
            "No skill requirements defined for this career role"
        )

    skills = []

    total_weight = 0.0
    assessed_weight = 0.0
    weighted_match = 0.0

    matched_skills = []
    gap_skills = []
    not_assessed_skills = []

    for requirement in requirements:

        skill = (
            db.query(Skill)
            .filter(
                Skill.id == requirement.skill_id
            )
            .first()
        )

        if not skill:
            continue

        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id == requirement.skill_id,
            )
            .first()
        )

        current_score = None

        if (
            student_skill
            and student_skill.score is not None
        ):
            current_score = float(student_skill.score)

        required_score = float(
            requirement.required_score
        )

        importance_weight = float(
            requirement.importance_weight
        )

        total_weight += importance_weight

        if current_score is None:

            skill_match = None
            gap_score = None
            eligible = False
            status = "NOT_ASSESSED"

            not_assessed_skills.append(
                {
                    "skill_id": skill.id,
                    "skill_name": skill.name,
                    "required_score": round(
                        required_score,
                        2,
                    ),
                    "importance_weight": round(
                        importance_weight,
                        2,
                    ),
                }
            )

        else:

            if required_score > 0:
                skill_match = min(
                    (current_score / required_score) * 100,
                    100,
                )
            else:
                skill_match = 100.0

            gap_score = max(
                required_score - current_score,
                0,
            )

            eligible = (
                current_score >= required_score
            )

            status = (
                "MEETS_REQUIREMENT"
                if eligible
                else "SKILL_GAP"
            )

            assessed_weight += importance_weight

            weighted_match += (
                skill_match * importance_weight
            )

            skill_result = {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "current_score": round(
                    current_score,
                    2,
                ),
                "required_score": round(
                    required_score,
                    2,
                ),
                "gap_score": round(
                    gap_score,
                    2,
                ),
                "importance_weight": round(
                    importance_weight,
                    2,
                ),
                "skill_match_percentage": round(
                    skill_match,
                    2,
                ),
                "eligible": eligible,
                "status": status,
            }

            if eligible:
                matched_skills.append(
                    skill_result
                )
            else:
                gap_skills.append(
                    skill_result
                )

        skill_result = {
            "skill_id": skill.id,
            "skill_name": skill.name,
            "current_score": (
                round(current_score, 2)
                if current_score is not None
                else None
            ),
            "required_score": round(
                required_score,
                2,
            ),
            "gap_score": (
                round(gap_score, 2)
                if gap_score is not None
                else None
            ),
            "importance_weight": round(
                importance_weight,
                2,
            ),
            "skill_match_percentage": (
                round(skill_match, 2)
                if skill_match is not None
                else None
            ),
            "eligible": eligible,
            "status": status,
        }

        skills.append(skill_result)

    if assessed_weight > 0:

        assessed_match = (
            weighted_match / assessed_weight
        )

    else:

        assessed_match = 0.0

    if total_weight > 0:

        assessment_coverage = (
            assessed_weight / total_weight
        ) * 100

    else:

        assessment_coverage = 0.0

    # Overall match considers unassessed requirements
    # as missing evidence rather than an actual score of zero.
    if total_weight > 0:

        overall_match = (
            weighted_match / total_weight
        )

    else:

        overall_match = 0.0

    overall_match = round(
        min(overall_match, 100),
        2,
    )

    eligibility = (
        len(gap_skills) == 0
        and len(not_assessed_skills) == 0
    )

    readiness = get_readiness_level(
        overall_match,
        gap_skills,
        not_assessed_skills,
    )

    return {
        "career_role_id": career_role.id,
        "career_role": career_role.name,
        "career_description": career_role.description,

        "overall_match_percentage": overall_match,

        "assessed_skill_match_percentage": round(
            assessed_match,
            2,
        ),

        "assessment_coverage_percentage": round(
            assessment_coverage,
            2,
        ),

        "eligibility": eligibility,

        "readiness": readiness,

        "total_required_skills": len(
            requirements
        ),

        "assessed_skill_count": len(
            skills
        ) - len(not_assessed_skills),

        "matched_skill_count": len(
            matched_skills
        ),

        "skill_gap_count": len(
            gap_skills
        ),

        "not_assessed_skill_count": len(
            not_assessed_skills
        ),

        "matched_skills": matched_skills,

        "skill_gaps": gap_skills,

        "not_assessed_skills": not_assessed_skills,

        "skills": skills,

        "recommendation_reason": generate_recommendation_reason(
            career_role.name,
            overall_match,
            eligibility,
            gap_skills,
            not_assessed_skills,
        ),
    }


def calculate_all_career_matches(
    db: Session,
    student_id: int,
):
    """
    Compare a student against every active AYUSH
    career role and return ranked recommendations.
    """

    career_roles = (
        db.query(CareerRole)
        .filter(
            CareerRole.is_active.is_(True)
        )
        .order_by(CareerRole.id)
        .all()
    )

    if not career_roles:
        raise ValueError(
            "No active career roles found"
        )

    recommendations = []

    for career_role in career_roles:

        try:

            result = calculate_career_match(
                db=db,
                student_id=student_id,
                career_role_id=career_role.id,
            )

            recommendations.append(result)

        except ValueError:
            continue

    if not recommendations:
        raise ValueError(
            "No career recommendations could be calculated"
        )

    # Ranking:
    # 1. Fully eligible careers
    # 2. Higher overall compatibility
    # 3. Higher assessment coverage
    # 4. Fewer skill gaps
    # 5. Fewer unassessed skills

    recommendations.sort(
        key=lambda item: (
            item["eligibility"],
            item["overall_match_percentage"],
            item["assessment_coverage_percentage"],
            -item["skill_gap_count"],
            -item["not_assessed_skill_count"],
        ),
        reverse=True,
    )

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):
        recommendation["rank"] = index

    return {
        "student_id": student_id,
        "total_careers_evaluated": len(
            recommendations
        ),
        "recommendations": recommendations,
    }


def get_readiness_level(
    overall_match: float,
    gap_skills: list,
    not_assessed_skills: list,
) -> str:
    """
    Determine overall career readiness.
    """

    critical_gaps = [
        skill
        for skill in gap_skills
        if skill["gap_score"] > 30
    ]

    high_gaps = [
        skill
        for skill in gap_skills
        if 20 < skill["gap_score"] <= 30
    ]

    if critical_gaps:
        return "LOW"

    if high_gaps:
        return "MODERATE"

    if not_assessed_skills:
        if overall_match >= 75:
            return "GOOD"

        if overall_match >= 50:
            return "MODERATE"

        return "LOW"

    if overall_match >= 90:
        return "HIGH"

    if overall_match >= 75:
        return "GOOD"

    if overall_match >= 60:
        return "MODERATE"

    return "LOW"


def generate_recommendation_reason(
    career_role_name: str,
    overall_match: float,
    eligibility: bool,
    gap_skills: list,
    not_assessed_skills: list,
) -> str:
    """
    Generate deterministic explanation for the
    career recommendation.
    """

    if eligibility:

        return (
            f"You meet all required skill thresholds "
            f"for {career_role_name} with an overall "
            f"career match of {overall_match}%."
        )

    if gap_skills:

        highest_gap = max(
            gap_skills,
            key=lambda skill: skill["gap_score"],
        )

        reason = (
            f"Your current career match for "
            f"{career_role_name} is {overall_match}%. "
            f"Your largest skill gap is "
            f"{highest_gap['skill_name']} "
            f"with a gap of "
            f"{highest_gap['gap_score']} points."
        )

        if not_assessed_skills:

            reason += (
                f" {len(not_assessed_skills)} "
                f"required skill(s) are also not yet assessed."
            )

        return reason

    if not_assessed_skills:

        return (
            f"Your current career match for "
            f"{career_role_name} is {overall_match}%. "
            f"{len(not_assessed_skills)} required "
            f"skill(s) still need assessment."
        )

    return (
        f"Your current career match for "
        f"{career_role_name} is {overall_match}%."
    )