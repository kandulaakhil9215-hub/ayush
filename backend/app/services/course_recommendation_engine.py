from sqlalchemy.orm import Session

from app.models.identity import Student
from app.models.learning import Course, CourseSkill
from app.models.skills import StudentSkill
from app.services.skill_demand_engine import (
    get_training_requirements,
)


def calculate_course_recommendations(student_id: int, db: Session):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        return {
            "student_id": student_id,
            "recommendation_count": 0,
            "recommendations": [],
        }

    # ---------------------------------------------------------
    # 1. Get student's currently assessed skills
    # ---------------------------------------------------------
    student_skills = (
        db.query(StudentSkill)
        .filter(
            StudentSkill.student_id == student.id,
            StudentSkill.score.isnot(None),
        )
        .all()
    )

    current_scores = {
        skill.skill_id: skill.score
        for skill in student_skills
    }

    # ---------------------------------------------------------
    # 2. Student profile relevance
    # ---------------------------------------------------------
    department = (student.department or "").lower()
    degree = (student.degree or "").lower()

    # Skills that are generally highly useful across AYUSH careers.
    cross_domain_keywords = {
        "clinical research",
        "research methodology",
        "clinical documentation",
        "patient communication",
        "digital health",
        "statistics",
        "data analysis",
        "medical ethics",
        "ayush hospital management",
    }

    recommendations = []

    courses = (
        db.query(Course)
        .filter(Course.status == "ACTIVE")
        .all()
    )

    # ---------------------------------------------------------
    # 3. Industry training requirements
    # ---------------------------------------------------------
    training_data = get_training_requirements(
        db,
        limit=100,
    )

    industry_training_map = {
        item["skill_id"]: item
        for item in training_data["requirements"]
    }

    # ---------------------------------------------------------
    # 4. Evaluate every active course
    # ---------------------------------------------------------
    for course in courses:

        course_skills = (
            db.query(CourseSkill)
            .filter(
                CourseSkill.course_id == course.id
            )
            .all()
        )

        if not course_skills:
            continue

        skill_details = []

        total_weight = 0.0
        weighted_gap_score = 0.0
        weighted_coverage = 0.0

        gap_skill_count = 0
        not_assessed_count = 0
        mastered_count = 0

        career_relevance_bonus = 0.0
        industry_relevance_bonus = 0.0
        industry_training_skills = []

        # -----------------------------------------------------
        # Evaluate each skill covered by the course
        # -----------------------------------------------------
        for course_skill in course_skills:

            current_score = current_scores.get(
                course_skill.skill_id
            )

            coverage = (
                course_skill.coverage_percentage
                if course_skill.coverage_percentage is not None
                else 0.0
            )

            weight = (
                course_skill.importance_weight
                if course_skill.importance_weight is not None
                else 1.0
            )

            target_level = course_skill.target_level

            # Skill level 1-5 maps to 20-100.
            target_score = (
                target_level * 20
                if target_level is not None
                else 60
            )

            skill = course_skill.skill
            skill_name = skill.name

            # -------------------------------------------------
            # Industry training requirement relevance
            # -------------------------------------------------
            industry_requirement = industry_training_map.get(
                course_skill.skill_id
            )

            if industry_requirement:

                training_priority = industry_requirement[
                    "training_priority"
                ]

                if training_priority == "CRITICAL":
                    industry_relevance_bonus += 12

                elif training_priority == "HIGH":
                    industry_relevance_bonus += 9

                elif training_priority == "MEDIUM":
                    industry_relevance_bonus += 6

                elif training_priority == "LOW":
                    industry_relevance_bonus += 3

                industry_training_skills.append(
                    {
                        "skill_id": course_skill.skill_id,
                        "skill_name": skill_name,
                        "training_priority": training_priority,
                        "current_gap": industry_requirement[
                            "skill_gap_count"
                        ],
                        "future_gap": industry_requirement[
                            "predicted_future_skill_gap"
                        ],
                        "future_shortage": industry_requirement[
                            "future_shortage_level"
                        ],
                        "forecast_trend": industry_requirement[
                            "forecast_trend"
                        ],
                    }
                )

            # -------------------------------------------------
            # Skill status
            # -------------------------------------------------
            if current_score is None:

                status = "NOT_ASSESSED"

                gap = target_score
                gap_ratio = 1.0

                not_assessed_count += 1
                gap_skill_count += 1

            else:

                gap = max(
                    target_score - current_score,
                    0,
                )

                if gap <= 0:

                    status = "ALREADY_MEETS_TARGET"

                    gap_ratio = 0.0
                    mastered_count += 1

                elif gap <= 20:

                    status = "LOW_GAP"

                    gap_ratio = gap / 20
                    gap_skill_count += 1

                elif gap <= 40:

                    status = "MEDIUM_GAP"

                    gap_ratio = gap / 40
                    gap_skill_count += 1

                else:

                    status = "HIGH_GAP"

                    gap_ratio = 1.0
                    gap_skill_count += 1

            # -------------------------------------------------
            # Skill gap contribution
            # -------------------------------------------------
            gap_contribution = (
                gap_ratio
                * coverage
                * weight
            )

            weighted_gap_score += gap_contribution

            weighted_coverage += (
                coverage * weight
            )

            total_weight += weight

            # -------------------------------------------------
            # Cross-domain career relevance
            # -------------------------------------------------
            if skill_name.lower() in cross_domain_keywords:
                career_relevance_bonus += 8

            # -------------------------------------------------
            # AYUSH specialization relevance
            # -------------------------------------------------
            if department:
                if department in skill_name.lower():
                    career_relevance_bonus += 5

            skill_details.append(
                {
                    "skill_id": skill.id,
                    "skill_name": skill_name,
                    "current_score": current_score,
                    "target_score": target_score,
                    "gap": round(gap, 2),
                    "coverage_percentage": coverage,
                    "status": status,
                }
            )

        if total_weight <= 0:
            continue

              # -----------------------------------------------------
        # Core scores
        # -----------------------------------------------------

        gap_score = (
            weighted_gap_score / total_weight
        )

        coverage_score = (
            weighted_coverage / total_weight
        )

        # -----------------------------------------------------
        # Industry-demand intelligence
        # -----------------------------------------------------

        critical_industry_count = sum(
            1
            for item in industry_training_skills
            if item["training_priority"] == "CRITICAL"
        )

        high_industry_count = sum(
            1
            for item in industry_training_skills
            if item["training_priority"] == "HIGH"
        )

        medium_industry_count = sum(
            1
            for item in industry_training_skills
            if item["training_priority"] == "MEDIUM"
        )

        # Convert industry demand into a normalized 0-100 score.
        industry_demand_score = min(
            (
                (critical_industry_count * 100)
                + (high_industry_count * 75)
                + (medium_industry_count * 50)
            )
            / max(len(course_skills), 1),
            100,
        )

        # -----------------------------------------------------
        # Future shortage intelligence
        # -----------------------------------------------------

        future_critical_count = sum(
            1
            for item in industry_training_skills
            if item["future_shortage"] == "CRITICAL"
        )

        future_high_count = sum(
            1
            for item in industry_training_skills
            if item["future_shortage"] == "HIGH"
        )

        future_medium_count = sum(
            1
            for item in industry_training_skills
            if item["future_shortage"] == "MEDIUM"
        )

        future_shortage_score = min(
            (
                (future_critical_count * 100)
                + (future_high_count * 75)
                + (future_medium_count * 50)
            )
            / max(len(course_skills), 1),
            100,
        )

        # -----------------------------------------------------
        # Course quality factors
        # -----------------------------------------------------

        certification_score = (
            100
            if course.certification_available
            else 0
        )

        difficulty_score = 0

        difficulty = (
            course.difficulty_level or ""
        ).upper()

        if difficulty == "ADVANCED":
            difficulty_score = 100

        elif difficulty == "INTERMEDIATE":
            difficulty_score = 70

        elif difficulty == "BEGINNER":
            difficulty_score = 50

        # Multi-skill courses receive a modest advantage.
        multi_skill_score = min(
            len(course_skills) * 25,
            100,
        )

        # Career relevance is converted to a bounded score.
        career_relevance_score = min(
            career_relevance_bonus * 5,
            100,
        )

        # -----------------------------------------------------
        # Student gap priority
        # -----------------------------------------------------

        gap_priority_score = min(
            gap_skill_count * 50,
            100,
        )

        # A course with only mastered skills should not
        # outrank courses that address genuine gaps.
        if gap_skill_count == 0:
            gap_priority_score = 0

        # -----------------------------------------------------
        # Final recommendation score
        #
        # 35% Student skill gap
        # 20% Industry demand
        # 15% Future shortage
        # 10% Assessment coverage
        # 5% Career relevance
        # 5% Certification
        # 5% Multi-skill coverage
        # 5% Difficulty
        # -----------------------------------------------------

        recommendation_score = (
            (gap_score * 0.35)
            + (industry_demand_score * 0.20)
            + (future_shortage_score * 0.15)
            + (coverage_score * 0.10)
            + (career_relevance_score * 0.05)
            + (certification_score * 0.05)
            + (multi_skill_score * 0.05)
            + (difficulty_score * 0.05)
        )

        # Additional gap-priority adjustment.
        recommendation_score += (
            gap_priority_score * 0.10
        )

        recommendation_score = min(
            max(recommendation_score, 0),
            100,
        )

        # -----------------------------------------------------
        # Generate explanation
        # -----------------------------------------------------

        reasons = []

        if not_assessed_count > 0:

            reasons.append(
                f"{not_assessed_count} skill(s) are not yet assessed"
            )

        if gap_skill_count > 0:

            gap_names = [
                item["skill_name"]
                for item in skill_details
                if item["gap"] > 0
            ]

            if gap_names:

                reasons.append(
                    "targets skill gaps in "
                    + ", ".join(gap_names)
                )

        if mastered_count == len(course_skills):

            reasons.append(
                "all covered skills already meet the target level"
            )

        if course.certification_available:

            reasons.append(
                "certification available"
            )

        if len(course_skills) > 1:

            reasons.append(
                f"covers {len(course_skills)} related skills"
            )

        if any(
            item["skill_name"].lower()
            in cross_domain_keywords
            for item in skill_details
        ):

            reasons.append(
                "supports cross-domain AYUSH career development"
            )

        if industry_training_skills:

            critical_skills = [
                item["skill_name"]
                for item in industry_training_skills
                if item["training_priority"] == "CRITICAL"
            ]

            high_skills = [
                item["skill_name"]
                for item in industry_training_skills
                if item["training_priority"] == "HIGH"
            ]

            if critical_skills:

                reasons.append(
                    "addresses critical industry training needs in "
                    + ", ".join(critical_skills)
                )

            elif high_skills:

                reasons.append(
                    "addresses high-priority industry training needs in "
                    + ", ".join(high_skills)
                )

        if reasons:

            reason = (
                "Recommended because "
                + "; ".join(reasons)
                + "."
            )

        else:

            reason = (
                "Recommended for continued professional development."
            )

        # -----------------------------------------------------
        # Store recommendation
        # -----------------------------------------------------

        recommendations.append(
            {
                "course_id": course.id,
                "title": course.title,
                "description": course.description,
                "provider": course.provider,
                "course_type": course.course_type,
                "difficulty_level": course.difficulty_level,
                "duration_hours": course.duration_hours,
                "certification_available": (
                    course.certification_available
                ),
                "verified": course.verified,
                "relevance_score": round(
                    recommendation_score,
                    2,
                ),
                "reason": reason,
                "skills": skill_details,
                "gap_skill_count": gap_skill_count,
                "not_assessed_skill_count": (
                    not_assessed_count
                ),
                "mastered_skill_count": mastered_count,
                "industry_training_relevance": (
                    industry_training_skills
                ),
                "industry_training_relevance_score": round(
                    industry_relevance_bonus,
                    2,
                ),
                                "industry_demand_score": round(
                    industry_demand_score,
                    2,
                ),
                "future_shortage_score": round(
                    future_shortage_score,
                    2,
                ),
                "critical_industry_skill_count": (
                    critical_industry_count
                ),
                "high_industry_skill_count": (
                    high_industry_count
                ),
            }
        )

    # ---------------------------------------------------------
    # Ranking
    # ---------------------------------------------------------

    recommendations.sort(
        key=lambda item: (
            item["relevance_score"],
            item["gap_skill_count"],
            item["not_assessed_skill_count"],
            item["certification_available"],
        ),
        reverse=True,
    )

    # ---------------------------------------------------------
    # Assign rank
    # ---------------------------------------------------------

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):
        recommendation["rank"] = index

    return {
        "student_id": student.id,
        "student_name": student.user.full_name,
        "recommendation_count": len(
            recommendations
        ),
        "recommendations": recommendations,
    }