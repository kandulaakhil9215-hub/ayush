from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.career import CareerRole
from app.models.identity import Student
from app.models.learning import CourseSkill
from app.models.opportunities import Internship, OpportunitySkill
from app.models.skills import StudentSkill


def generate_career_path(
    db: Session,
    student_id: int,
    career_role_id: int,
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise ValueError("Student not found")

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

    required_skills = career_role.required_skills

    if not required_skills:
        raise ValueError(
            "No skills configured for this career role"
        )

    # ---------------------------------------------------------
    # CURRENT STUDENT SKILLS
    # ---------------------------------------------------------

    student_skills = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id == student_id,
            StudentSkill.score.isnot(None),
        )
        .all()
    )

    current_scores = {
        item.skill_id: item.score
        for item in student_skills
    }

    # ---------------------------------------------------------
    # SKILL ANALYSIS
    # ---------------------------------------------------------

    skill_analysis = []

    for requirement in required_skills:
        skill = requirement.skill

        if not skill:
            continue

        current_score = current_scores.get(skill.id)
        required_score = requirement.required_score

        if current_score is None:
            gap = required_score
            status = "NOT_ASSESSED"

        else:
            gap = max(
                required_score - current_score,
                0,
            )

            if gap <= 0:
                status = "READY"
            elif gap <= 10:
                status = "LOW_GAP"
            elif gap <= 25:
                status = "MEDIUM_GAP"
            else:
                status = "HIGH_GAP"

        skill_analysis.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "current_score": current_score,
                "required_score": required_score,
                "gap": round(gap, 2),
                "status": status,
                "importance_weight": requirement.importance_weight,
            }
        )

    skill_analysis.sort(
        key=lambda item: (
            item["status"] == "READY",
            -item["gap"],
            -item["importance_weight"],
        )
    )

    gap_skills = [
        item
        for item in skill_analysis
        if item["status"] != "READY"
    ]

    ready_skills = [
        item
        for item in skill_analysis
        if item["status"] == "READY"
    ]

    not_assessed_skills = [
        item
        for item in gap_skills
        if item["status"] == "NOT_ASSESSED"
    ]

    assessed_gap_skills = [
        item
        for item in gap_skills
        if item["status"] != "NOT_ASSESSED"
    ]

    # ---------------------------------------------------------
    # CAREER PATH
    # ---------------------------------------------------------

    steps = []
    step_order = 1

    # ---------------------------------------------------------
    # ASSESSMENT
    # ---------------------------------------------------------

    if not_assessed_skills:

        skill_names = [
            item["skill_name"]
            for item in not_assessed_skills
        ]

        steps.append(
            {
                "step_order": step_order,
                "step_type": "ASSESSMENT",
                "title": "Assess Required Career Skills",
                "description": (
                    "Complete assessments for the following "
                    "currently unassessed skills: "
                    + ", ".join(skill_names)
                    + "."
                ),
                "skill_id": None,
                "course_id": None,
                "duration_days": 1,
                "target_score": None,
            }
        )

        step_order += 1

    # ---------------------------------------------------------
    # COURSE RECOMMENDATIONS
    #
    # One course can cover multiple career-gap skills.
    # Therefore we group skills by course instead of creating
    # duplicate course steps.
    # ---------------------------------------------------------

    gap_skill_ids = {
        item["skill_id"]
        for item in gap_skills
    }

    course_groups = {}

    for skill_id in gap_skill_ids:

        course_candidates = (
            db.query(CourseSkill)
            .filter(
                CourseSkill.skill_id == skill_id
            )
            .all()
        )

        for course_skill in course_candidates:

            course = course_skill.course

            if not course:
                continue

            if course.status != "ACTIVE":
                continue

            if course.id not in course_groups:
                course_groups[course.id] = {
                    "course": course,
                    "skills": [],
                    "score": 0,
                }

            coverage = (
                course_skill.coverage_percentage
                if course_skill.coverage_percentage is not None
                else 0
            )

            importance = (
                course_skill.importance_weight
                if course_skill.importance_weight is not None
                else 1
            )

            course_groups[course.id]["skills"].append(
                {
                    "skill_id": skill_id,
                    "coverage": coverage,
                    "importance": importance,
                }
            )

    # ---------------------------------------------------------
    # SCORE COURSES
    # ---------------------------------------------------------

    for group in course_groups.values():

        course = group["course"]

        skill_score = sum(
            item["coverage"] * item["importance"]
            for item in group["skills"]
        )

        skill_count_bonus = (
            len(group["skills"]) * 20
        )

        certification_bonus = (
            10
            if course.certification_available
            else 0
        )

        verified_bonus = (
            5
            if course.verified
            else 0
        )

        group["score"] = (
            skill_score
            + skill_count_bonus
            + certification_bonus
            + verified_bonus
        )

    # ---------------------------------------------------------
    # SELECT COURSES
    #
    # Prefer courses covering multiple missing skills.
    # ---------------------------------------------------------

    selected_courses = []

    remaining_skill_ids = set(gap_skill_ids)

    while remaining_skill_ids:

        best_group = None
        best_score = -1

        for group in course_groups.values():

            course = group["course"]

            covered_remaining = [
                skill
                for skill in group["skills"]
                if skill["skill_id"] in remaining_skill_ids
            ]

            if not covered_remaining:
                continue

            coverage_value = sum(
                skill["coverage"]
                * skill["importance"]
                for skill in covered_remaining
            )

            multi_skill_bonus = (
                len(covered_remaining) * 30
            )

            score = (
                coverage_value
                + multi_skill_bonus
            )

            if course.certification_available:
                score += 10

            if course.verified:
                score += 5

            if score > best_score:
                best_score = score
                best_group = group

        if not best_group:
            break

        selected_courses.append(best_group)

        covered_ids = {
            skill["skill_id"]
            for skill in best_group["skills"]
            if skill["skill_id"] in remaining_skill_ids
        }

        remaining_skill_ids -= covered_ids

    # ---------------------------------------------------------
    # ADD COURSE STEPS
    # ---------------------------------------------------------

    for group in selected_courses:

        course = group["course"]

        covered_skill_ids = [
            skill["skill_id"]
            for skill in group["skills"]
            if skill["skill_id"] in gap_skill_ids
        ]

        covered_skill_names = [
            item["skill_name"]
            for item in skill_analysis
            if item["skill_id"] in covered_skill_ids
        ]

        target_scores = [
            item["required_score"]
            for item in skill_analysis
            if item["skill_id"] in covered_skill_ids
        ]

        target_score = (
            max(target_scores)
            if target_scores
            else None
        )

        if course.duration_hours:
            duration_days = max(
                7,
                round(course.duration_hours / 2),
            )
        else:
            duration_days = 14

        if len(covered_skill_names) == 1:

            description = (
                f"This learning program is recommended "
                f"to develop {covered_skill_names[0]} "
                f"toward the required competency."
            )

        else:

            description = (
                "This learning program covers multiple "
                "career-gap skills: "
                + ", ".join(covered_skill_names)
                + "."
            )

        steps.append(
            {
                "step_order": step_order,
                "step_type": "COURSE",
                "title": f"Complete {course.title}",
                "description": description,
                "skill_id": (
                    covered_skill_ids[0]
                    if len(covered_skill_ids) == 1
                    else None
                ),
                "covered_skill_ids": covered_skill_ids,
                "covered_skills": covered_skill_names,
                "course_id": course.id,
                "duration_days": duration_days,
                "target_score": target_score,
            }
        )

        step_order += 1

    # ---------------------------------------------------------
    # INDUSTRY INTERNSHIP
    # ---------------------------------------------------------

    internships = (
        db.query(Internship)
        .filter(
            Internship.status == "OPEN"
        )
        .all()
    )

    best_internship = None
    best_internship_score = -1

    target_skill_ids = {
        item["skill_id"]
        for item in gap_skills
    }

    if not target_skill_ids:

        target_skill_ids = {
            item["skill_id"]
            for item in skill_analysis
        }

    for internship in internships:

        mappings = (
            db.query(OpportunitySkill)
            .filter(
                OpportunitySkill.internship_id
                == internship.id
            )
            .all()
        )

        if not mappings:
            continue

        matching_skills = 0
        weighted_match = 0

        for mapping in mappings:

            if mapping.skill_id in target_skill_ids:

                matching_skills += 1

                weight = (
                    mapping.importance_weight
                    if mapping.importance_weight is not None
                    else 1
                )

                weighted_match += weight

        if matching_skills == 0:
            continue

        score = (
            weighted_match * 10
            + matching_skills * 5
        )

        if internship.verified:
            score += 10

        if score > best_internship_score:
            best_internship_score = score
            best_internship = internship

    if best_internship:

        steps.append(
            {
                "step_order": step_order,
                "step_type": "INTERNSHIP",
                "title": f"Complete {best_internship.title}",
                "description": (
                    "Gain practical AYUSH industry exposure "
                    "and apply the required career skills in "
                    "a professional environment."
                ),
                "skill_id": None,
                "course_id": None,
                "duration_days": 45,
                "target_score": None,
            }
        )

        step_order += 1

    # ---------------------------------------------------------
    # PRACTICAL PROJECT
    # ---------------------------------------------------------

    if gap_skills:

        project_description = (
            f"Complete a practical project demonstrating "
            f"the skills required for the "
            f"{career_role.name} career."
        )

    else:

        project_description = (
            f"Complete an advanced practical project "
            f"demonstrating professional-level competency "
            f"for the {career_role.name} career."
        )

    steps.append(
        {
            "step_order": step_order,
            "step_type": "PROJECT",
            "title": (
                f"Complete the {career_role.name} Project"
            ),
            "description": project_description,
            "skill_id": None,
            "course_id": None,
            "duration_days": 30,
            "target_score": None,
        }
    )

    step_order += 1

    # ---------------------------------------------------------
    # REASSESSMENT
    # ---------------------------------------------------------

    if gap_skills:

        steps.append(
            {
                "step_order": step_order,
                "step_type": "REASSESSMENT",
                "title": "Reassess Career Skills",
                "description": (
                    "Repeat the relevant skill assessments "
                    "after training, practical experience "
                    "and project completion to measure "
                    "skill improvement."
                ),
                "skill_id": None,
                "course_id": None,
                "duration_days": 1,
                "target_score": None,
            }
        )

        step_order += 1

    # ---------------------------------------------------------
    # CAREER READY
    # ---------------------------------------------------------

    steps.append(
        {
            "step_order": step_order,
            "step_type": "CAREER_READY",
            "title": "Career Readiness Review",
            "description": (
                f"Review readiness for the "
                f"{career_role.name} role using verified "
                f"skills, assessment results, training, "
                f"projects and practical experience."
            ),
        }
    )

    # ---------------------------------------------------------
    # READINESS CALCULATION
    # ---------------------------------------------------------

    total_required_weight = sum(
        item["required_score"]
        * item["importance_weight"]
        for item in skill_analysis
    )

    weighted_current_score = 0

    for item in skill_analysis:

        current_score = item["current_score"]

        if current_score is None:
            effective_score = 0

        else:
            effective_score = min(
                current_score,
                item["required_score"],
            )

        weighted_current_score += (
            effective_score
            * item["importance_weight"]
        )

    if total_required_weight > 0:

        readiness = (
            weighted_current_score
            / total_required_weight
        ) * 100

    else:

        readiness = 0

    readiness = round(
        min(
            max(readiness, 0),
            100,
        ),
        2,
    )

    ready_skill_count = len(ready_skills)
    gap_skill_count = len(gap_skills)
    not_assessed_count = len(not_assessed_skills)

    # ---------------------------------------------------------
    # READINESS STATUS
    # ---------------------------------------------------------

    if gap_skill_count == 0:

        readiness_status = "CAREER_READY"

    elif not_assessed_count > 0:

        readiness_status = "ASSESSMENT_REQUIRED"

    elif readiness >= 75:

        readiness_status = "NEAR_READY"

    elif readiness >= 50:

        readiness_status = "DEVELOPING"

    else:

        readiness_status = "FOUNDATION"

    # ---------------------------------------------------------
    # WHY THIS PATH?
    # ---------------------------------------------------------

    reasons = []

    if gap_skill_count == 0:

        reasons.append(
            "all required career skills meet their target scores"
        )

    else:

        if not_assessed_count > 0:

            reasons.append(
                f"{not_assessed_count} required skill(s) "
                "need assessment"
            )

        if assessed_gap_skills:

            gap_names = [
                item["skill_name"]
                for item in assessed_gap_skills
            ]

            reasons.append(
                "skill development is required for "
                + ", ".join(gap_names)
            )

    if selected_courses:

        reasons.append(
            f"{len(selected_courses)} targeted learning "
            "program(s) address the identified skill gaps"
        )

    if best_internship:

        reasons.append(
            "relevant practical industry exposure is available"
        )

    if gap_skill_count == 0:

        reasons.append(
            "advanced project work is recommended to "
            "demonstrate professional competency"
        )

    else:

        reasons.append(
            "the path combines assessment, learning, "
            "practical experience and reassessment"
        )

    return {
        "student_id": student.id,
        "student_name": student.user.full_name,
        "career_role": {
            "id": career_role.id,
            "name": career_role.name,
            "description": career_role.description,
        },
        "why_this_path": reasons,
        "readiness": {
            "percentage": readiness,
            "status": readiness_status,
            "required_skill_count": len(skill_analysis),
            "ready_skill_count": ready_skill_count,
            "gap_skill_count": gap_skill_count,
            "not_assessed_skill_count": not_assessed_count,
        },
        "skill_analysis": skill_analysis,
        "career_path": steps,
        "step_count": len(steps),
    }