from sqlalchemy.orm import Session

from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import StudentSkill, Skill
from app.models.skill_gap import SkillGap


def calculate_skill_gap(
    db: Session,
    student_id: int,
    career_role_id: int,
):
    """
    Calculate skill gaps between a student's current skills
    and the requirements of a career role.

    Also calculates:
    - Overall career match percentage
    - Strong skills
    - Skill gaps
    - Gap priority
    - Overall readiness
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

    required_skills = (
        db.query(CareerRoleSkill)
        .filter(
            CareerRoleSkill.career_role_id == career_role_id
        )
        .all()
    )

    if not required_skills:
        raise ValueError("No skills defined for this career role")

    results = []

    total_weight = 0
    weighted_match = 0

    strong_skills = []
    gap_skills = []

    for required_skill in required_skills:

        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id == required_skill.skill_id,
            )
            .first()
        )

        skill = (
            db.query(Skill)
            .filter(Skill.id == required_skill.skill_id)
            .first()
        )

        current_score = (
            student_skill.score
            if student_skill and student_skill.score is not None
            else 0
        )

        required_score = required_skill.required_score

        gap_score = max(
            required_score - current_score,
            0,
        )

        severity = get_gap_severity(gap_score)

        # Calculate how much of the required skill level
        # the student currently satisfies.
        skill_match = min(
            current_score / required_score * 100,
            100,
        ) if required_score > 0 else 100

        importance_weight = required_skill.importance_weight

        total_weight += importance_weight
        weighted_match += skill_match * importance_weight

        # Determine gap priority
        priority = get_gap_priority(
            gap_score=gap_score,
            importance_weight=importance_weight,
        )

        skill_name = skill.name if skill else f"Skill {required_skill.skill_id}"

        # Save/update persistent skill gap
        existing_gap = (
            db.query(SkillGap)
            .filter(
                SkillGap.student_id == student_id,
                SkillGap.career_role_id == career_role_id,
                SkillGap.skill_id == required_skill.skill_id,
            )
            .first()
        )

        if existing_gap:

            existing_gap.current_score = current_score
            existing_gap.required_score = required_score
            existing_gap.gap_score = gap_score
            existing_gap.severity = severity

        else:

            existing_gap = SkillGap(
                student_id=student_id,
                career_role_id=career_role_id,
                skill_id=required_skill.skill_id,
                current_score=current_score,
                required_score=required_score,
                gap_score=gap_score,
                severity=severity,
            )

            db.add(existing_gap)

        skill_result = {
            "skill_id": required_skill.skill_id,
            "skill_name": skill_name,
            "current_score": current_score,
            "required_score": required_score,
            "gap_score": gap_score,
            "severity": severity,
            "priority": priority,
            "importance_weight": importance_weight,
            "skill_match_percentage": round(skill_match, 2),
        }

        results.append(skill_result)

        if gap_score <= 0:
            strong_skills.append(skill_result)
        else:
            gap_skills.append(skill_result)

    # Overall weighted career match
    overall_match = (
        weighted_match / total_weight
        if total_weight > 0
        else 0
    )

    overall_match = round(overall_match, 2)

    readiness = get_readiness_level(
        overall_match=overall_match,
        gap_skills=gap_skills,
    )

    db.commit()

    return {
        "student_id": student_id,
        "career_role_id": career_role_id,
        "career_role": career_role.name,

        "overall_match_percentage": overall_match,

        "readiness": readiness,

        "total_required_skills": len(required_skills),

        "strong_skill_count": len(strong_skills),

        "skill_gap_count": len(gap_skills),

        "strong_skills": strong_skills,

        "skill_gaps": gap_skills,

        "skills": results,

        "summary": generate_summary(
            career_role_name=career_role.name,
            overall_match=overall_match,
            gap_skills=gap_skills,
        ),
    }


def get_gap_severity(gap_score: float) -> str:
    """
    Convert numerical skill gap into a severity level.
    """

    if gap_score <= 0:
        return "NO_GAP"

    if gap_score <= 10:
        return "LOW"

    if gap_score <= 20:
        return "MEDIUM"

    if gap_score <= 30:
        return "HIGH"

    return "CRITICAL"


def get_gap_priority(
    gap_score: float,
    importance_weight: float,
) -> str:
    """
    Determine the priority of a skill gap.

    Larger gaps and more important skills receive
    higher priority.
    """

    priority_score = gap_score * importance_weight

    if priority_score <= 0:
        return "NONE"

    if priority_score <= 10:
        return "LOW"

    if priority_score <= 25:
        return "MEDIUM"

    if priority_score <= 40:
        return "HIGH"

    return "CRITICAL"


def get_readiness_level(
    overall_match: float,
    gap_skills: list,
) -> str:
    """
    Determine the student's overall readiness
    for a career role.
    """

    critical_gaps = [
        skill
        for skill in gap_skills
        if skill["severity"] == "CRITICAL"
    ]

    high_gaps = [
        skill
        for skill in gap_skills
        if skill["severity"] == "HIGH"
    ]

    if critical_gaps:
        return "LOW"

    if high_gaps:
        return "MODERATE"

    if overall_match >= 90:
        return "HIGH"

    if overall_match >= 75:
        return "GOOD"

    if overall_match >= 60:
        return "MODERATE"

    return "LOW"


def generate_summary(
    career_role_name: str,
    overall_match: float,
    gap_skills: list,
) -> str:
    """
    Generate a simple deterministic summary.
    """

    if not gap_skills:
        return (
            f"You currently meet all required skill thresholds "
            f"for the {career_role_name} career role."
        )

    critical_count = sum(
        1
        for skill in gap_skills
        if skill["severity"] == "CRITICAL"
    )

    high_count = sum(
        1
        for skill in gap_skills
        if skill["severity"] == "HIGH"
    )

    if critical_count > 0:
        return (
            f"You have {critical_count} critical skill gap(s) "
            f"for the {career_role_name} career role. "
            f"Priority skill development is recommended."
        )

    if high_count > 0:
        return (
            f"You have {high_count} high-priority skill gap(s) "
            f"for the {career_role_name} career role. "
            f"Focused training can improve your readiness."
        )

    return (
        f"Your current career match is {overall_match}%. "
        f"Targeted skill development can further improve "
        f"your readiness for {career_role_name}."
    )