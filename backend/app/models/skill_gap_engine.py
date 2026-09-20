from sqlalchemy.orm import Session

from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import StudentSkill
from app.models.skill_gap import SkillGap


def calculate_skill_gap(
    db: Session,
    student_id: int,
    career_role_id: int,
):
    """
    Calculate the skill gaps between a student's current
    skills and the requirements of a career role.
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

    results = []

    for required_skill in required_skills:

        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id == required_skill.skill_id,
            )
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

            gap_record = existing_gap

        else:

            gap_record = SkillGap(
                student_id=student_id,
                career_role_id=career_role_id,
                skill_id=required_skill.skill_id,
                current_score=current_score,
                required_score=required_score,
                gap_score=gap_score,
                severity=severity,
            )

            db.add(gap_record)

        results.append(
            {
                "skill_id": required_skill.skill_id,
                "current_score": current_score,
                "required_score": required_score,
                "gap_score": gap_score,
                "severity": severity,
            }
        )

    db.commit()

    return {
        "student_id": student_id,
        "career_role_id": career_role_id,
        "career_role": career_role.name,
        "skills": results,
    }


def get_gap_severity(gap_score: float) -> str:
    """
    Convert numerical skill gap into a meaningful severity level.
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