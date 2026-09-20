from sqlalchemy.orm import Session

from app.models.identity import Student
from app.models.skills import StudentSkill
from app.models.eligibility import EligibilityRule
from app.models.opportunities import OpportunitySkill


def evaluate_eligibility(
    db: Session,
    student_id: int,
    opportunity_type: str,
    opportunity_id: int,
):
    opportunity_type = opportunity_type.upper()

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise ValueError("Student not found")

    # -----------------------------------------------------
    # GET EXPLICIT ELIGIBILITY RULES
    # -----------------------------------------------------

    if opportunity_type == "INTERNSHIP":
        rules = (
            db.query(EligibilityRule)
            .filter(
                EligibilityRule.internship_id == opportunity_id
            )
            .all()
        )

        opportunity_skills = (
            db.query(OpportunitySkill)
            .filter(
                OpportunitySkill.internship_id == opportunity_id
            )
            .all()
        )

    elif opportunity_type == "JOB":
        rules = (
            db.query(EligibilityRule)
            .filter(
                EligibilityRule.job_id == opportunity_id
            )
            .all()
        )

        opportunity_skills = (
            db.query(OpportunitySkill)
            .filter(
                OpportunitySkill.job_id == opportunity_id
            )
            .all()
        )

    else:
        raise ValueError("Invalid opportunity type")

    results = []
    passed_rules = []
    failed_rules = []

    # -----------------------------------------------------
    # 1. EXPLICIT ELIGIBILITY RULES
    # -----------------------------------------------------

    for rule in rules:

        current_value = None

        if rule.rule_type == "SKILL":

            student_skill = (
                db.query(StudentSkill)
                .filter(
                    StudentSkill.student_id == student_id,
                    StudentSkill.skill_id == rule.skill_id,
                )
                .first()
            )

            if student_skill:
                current_value = student_skill.score

        elif rule.rule_type == "CGPA":

            current_value = student.cgpa

        else:
            continue

        passed = False

        if current_value is not None:

            if rule.operator == ">=":
                passed = current_value >= rule.required_value

            elif rule.operator == ">":
                passed = current_value > rule.required_value

            elif rule.operator == "=":
                passed = current_value == rule.required_value

            elif rule.operator == "<=":
                passed = current_value <= rule.required_value

            elif rule.operator == "<":
                passed = current_value < rule.required_value

        result = {
            "rule_id": rule.id,
            "rule_type": rule.rule_type,
            "skill_id": rule.skill_id,
            "operator": rule.operator,
            "required_value": round(
                rule.required_value,
                2,
            ),
            "current_value": (
                round(current_value, 2)
                if current_value is not None
                else None
            ),
            "passed": passed,
            "mandatory": rule.is_mandatory,
            "description": rule.description,
        }

        results.append(result)

        if passed:
            passed_rules.append(result)

        elif rule.is_mandatory:
            failed_rules.append(result)

    # -----------------------------------------------------
    # 2. REQUIRED OPPORTUNITY SKILLS
    #
    # These are automatically treated as mandatory.
    # -----------------------------------------------------

    existing_skill_rule_ids = {
        rule.skill_id
        for rule in rules
        if rule.rule_type == "SKILL"
        and rule.skill_id is not None
    }

    for requirement in opportunity_skills:

        # Avoid checking the same skill twice if an explicit
        # eligibility rule already exists for it.
        if requirement.skill_id in existing_skill_rule_ids:
            continue

        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id == requirement.skill_id,
            )
            .first()
        )

        current_value = (
            student_skill.score
            if student_skill
            else None
        )

        passed = (
            current_value is not None
            and current_value >= requirement.required_score
        )

        result = {
            "rule_id": None,
            "rule_type": "REQUIRED_OPPORTUNITY_SKILL",
            "skill_id": requirement.skill_id,
            "operator": ">=",
            "required_value": round(
                requirement.required_score,
                2,
            ),
            "current_value": (
                round(current_value, 2)
                if current_value is not None
                else None
            ),
            "passed": passed,
            "mandatory": True,
            "description": (
                "Required skill for this opportunity"
            ),
        }

        results.append(result)

        if passed:
            passed_rules.append(result)
        else:
            failed_rules.append(result)

    # -----------------------------------------------------
    # FINAL ELIGIBILITY
    # -----------------------------------------------------

    eligible = len(failed_rules) == 0

    return {
        "student_id": student_id,
        "opportunity_type": opportunity_type,
        "opportunity_id": opportunity_id,
        "eligible": eligible,
        "total_rules": len(results),
        "passed_rules": len(passed_rules),
        "failed_rules": len(failed_rules),
        "rules": results,
    }