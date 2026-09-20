from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.opportunities import Internship, Job, OpportunitySkill
from app.models.skills import Skill, StudentSkill
from app.models.identity import Student


def calculate_skill_demand(
    db: Session,
    period: str = "CURRENT",
):
    """
    Calculate current AYUSH industry skill demand.

    Demand is derived from:
    - Open internships
    - Open jobs
    - Required skill mappings
    - Required skill scores
    - Number of industries demanding the skill

    Student supply is derived from assessed student skills.
    """

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

    skill_stats = defaultdict(
        lambda: {
            "demand_count": 0,
            "industry_ids": set(),
            "total_required_score": 0.0,
            "job_count": 0,
            "internship_count": 0,
        }
    )

    # ---------------------------------------------------------
    # INTERNSHIP DEMAND
    # ---------------------------------------------------------

    for internship in internships:

        mappings = (
            db.query(OpportunitySkill)
            .filter(OpportunitySkill.internship_id == internship.id)
            .all()
        )

        for mapping in mappings:

            stats = skill_stats[mapping.skill_id]

            stats["demand_count"] += 1
            stats["internship_count"] += 1

            if internship.industry_id:
                stats["industry_ids"].add(internship.industry_id)

            stats["total_required_score"] += (
                mapping.required_score
            )

    # ---------------------------------------------------------
    # JOB DEMAND
    # ---------------------------------------------------------

    for job in jobs:

        mappings = (
            db.query(OpportunitySkill)
            .filter(OpportunitySkill.job_id == job.id)
            .all()
        )

        for mapping in mappings:

            stats = skill_stats[mapping.skill_id]

            stats["demand_count"] += 1
            stats["job_count"] += 1

            if job.industry_id:
                stats["industry_ids"].add(job.industry_id)

            stats["total_required_score"] += (
                mapping.required_score
            )

    # ---------------------------------------------------------
    # STUDENT SUPPLY
    # ---------------------------------------------------------

    students = db.query(Student).all()

    supply = defaultdict(int)

    for student in students:

        assessed_skills = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student.id,
                StudentSkill.score.isnot(None),
            )
            .all()
        )

        for student_skill in assessed_skills:
            supply[student_skill.skill_id] += 1

    # ---------------------------------------------------------
    # BUILD RESULTS
    # ---------------------------------------------------------

    results = []

    skills = db.query(Skill).all()

    for skill in skills:

        stats = skill_stats.get(
            skill.id,
            {
                "demand_count": 0,
                "industry_ids": set(),
                "total_required_score": 0.0,
                "job_count": 0,
                "internship_count": 0,
            },
        )

        demand_count = stats["demand_count"]

        if demand_count > 0:
            average_required_score = (
                stats["total_required_score"]
                / demand_count
            )
        else:
            average_required_score = 0.0

        student_supply = supply.get(skill.id, 0)

        skill_gap_count = max(
            demand_count - student_supply,
            0,
        )

        if demand_count > 0:
            gap_percentage = (
                skill_gap_count
                / demand_count
            ) * 100
        else:
            gap_percentage = 0.0

        # Demand score combines:
        # 1. Number of opportunities
        # 2. Number of industries
        # 3. Required competency level

        industry_count = len(
            stats["industry_ids"]
        )

        demand_score = (
            demand_count * 50
            + industry_count * 30
            + average_required_score * 0.20
        )

        results.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "category": (
                    skill.category.name
                    if skill.category
                    else None
                ),
                "ayush_system": (
                    skill.category.ayush_system.name
                    if skill.category
                    and skill.category.ayush_system
                    else None
                ),
                "demand_count": demand_count,
                "industry_count": industry_count,
                "job_demand_count": stats["job_count"],
                "internship_demand_count": (
                    stats["internship_count"]
                ),
                "average_required_score": round(
                    average_required_score,
                    2,
                ),
                "student_supply_count": student_supply,
                "skill_gap_count": skill_gap_count,
                "gap_percentage": round(
                    gap_percentage,
                    2,
                ),
                "demand_score": round(
                    demand_score,
                    2,
                ),
            }
        )

    results.sort(
        key=lambda item: (
            item["demand_score"],
            item["skill_gap_count"],
        ),
        reverse=True,
    )

    return {
        "generated_at": datetime.utcnow(),
        "period": period,
        "total_skills": len(results),
        "skills_with_demand": sum(
            1
            for item in results
            if item["demand_count"] > 0
        ),
        "results": results,
    }


def get_emerging_skills(
    db: Session,
    limit: int = 10,
):
    """
    Identify currently emerging skills.

    Current implementation uses demand score and
    demand breadth as the baseline. Historical
    growth-rate modelling will be added later.
    """

    demand_data = calculate_skill_demand(db)

    skills = [
        item
        for item in demand_data["results"]
        if item["demand_count"] > 0
    ]

    skills.sort(
        key=lambda item: (
            item["industry_count"],
            item["demand_count"],
            item["demand_score"],
        ),
        reverse=True,
    )

    for item in skills:
        item["trend"] = (
            "HIGH_DEMAND"
            if item["demand_count"] >= 3
            else "EMERGING"
        )

    return {
        "generated_at": demand_data["generated_at"],
        "total_emerging_skills": min(
            len(skills),
            limit,
        ),
        "skills": skills[:limit],
    }


def get_training_requirements(
    db: Session,
    limit: int = 20,
):
    """
    Identify current and future training requirements.

    Training requirements are determined using:
    - Current industry demand
    - Current assessed student supply
    - Current skill gap
    - Forecasted future demand
    - Forecasted future skill shortage

    This connects the demand engine with the forecasting
    engine so institutions can prioritize training based
    on both present and expected industry needs.
    """

    demand_data = calculate_skill_demand(db)

    # Import locally to avoid circular imports.
    from app.services.skill_forecasting_engine import (
        forecast_skill_demand,
    )

    forecast_data = forecast_skill_demand(
        db,
        forecast_periods=3,
    )

    forecast_map = {
        item["skill_id"]: item
        for item in forecast_data["forecasts"]
    }

    training_requirements = []

    for item in demand_data["results"]:

        current_gap = item["skill_gap_count"]
        current_demand = item["demand_count"]

        forecast = forecast_map.get(
            item["skill_id"]
        )

        if forecast:

            future_demand = forecast[
                "predicted_future_demand"
            ]

            future_gap = forecast[
                "predicted_skill_gap"
            ]

            future_shortage = forecast[
                "shortage_level"
            ]

            forecast_trend = forecast[
                "trend"
            ]

            forecast_confidence = forecast[
                "confidence_score"
            ]

        else:

            future_demand = 0.0
            future_gap = 0.0
            future_shortage = "NONE"
            forecast_trend = "STABLE"
            forecast_confidence = 0.0

        # -----------------------------------------------------
        # DETERMINE WHETHER TRAINING IS REQUIRED
        # -----------------------------------------------------

        has_current_gap = (
            current_demand > 0
            and current_gap > 0
        )

        has_future_gap = (
            future_gap > 0
        )

        if not (
            has_current_gap
            or has_future_gap
        ):
            continue

        # -----------------------------------------------------
        # CURRENT TRAINING PRIORITY
        # -----------------------------------------------------

        if item["gap_percentage"] >= 75:

            current_priority = "CRITICAL"

        elif item["gap_percentage"] >= 50:

            current_priority = "HIGH"

        elif item["gap_percentage"] >= 25:

            current_priority = "MEDIUM"

        else:

            current_priority = "LOW"

        # -----------------------------------------------------
        # FUTURE TRAINING PRIORITY
        # -----------------------------------------------------

        if future_shortage == "CRITICAL":

            future_priority = "CRITICAL"

        elif future_shortage == "HIGH":

            future_priority = "HIGH"

        elif future_shortage == "MEDIUM":

            future_priority = "MEDIUM"

        elif future_shortage == "LOW":

            future_priority = "LOW"

        else:

            future_priority = "NONE"

        # -----------------------------------------------------
        # OVERALL TRAINING PRIORITY
        # -----------------------------------------------------

        priority_rank = {
            "NONE": 0,
            "LOW": 1,
            "MEDIUM": 2,
            "HIGH": 3,
            "CRITICAL": 4,
        }

        overall_priority = max(
            current_priority,
            future_priority,
            key=lambda value: priority_rank[value],
        )

        # -----------------------------------------------------
        # RECOMMENDATION REASON
        # -----------------------------------------------------

        reasons = []

        if has_current_gap:

            reasons.append(
                f"Current industry demand exceeds assessed "
                f"student supply by {current_gap}."
            )

        if has_future_gap:

            reasons.append(
                f"Forecasted demand indicates a future "
                f"skill gap of {future_gap}."
            )

        if forecast_trend == "RISING":

            reasons.append(
                "Industry demand is showing a rising trend."
            )

        if future_shortage == "CRITICAL":

            reasons.append(
                "Forecast indicates a critical future shortage."
            )

        elif future_shortage == "HIGH":

            reasons.append(
                "Forecast indicates a high future shortage."
            )

        training_requirements.append(
            {
                **item,

                # Current intelligence
                "current_training_priority":
                    current_priority,

                # Forecast intelligence
                "forecast_periods":
                    forecast_data["forecast_periods"],

                "predicted_future_demand":
                    future_demand,

                "predicted_future_skill_gap":
                    future_gap,

                "future_shortage_level":
                    future_shortage,

                "forecast_trend":
                    forecast_trend,

                "forecast_confidence_score":
                    forecast_confidence,

                # Combined intelligence
                "training_priority":
                    overall_priority,

                "training_recommendation_reason":
                    " ".join(reasons),
            }
        )

    # ---------------------------------------------------------
    # SORT BY OVERALL TRAINING PRIORITY
    # THEN CURRENT/FUTURE GAP
    # ---------------------------------------------------------

    priority_rank = {
        "NONE": 0,
        "LOW": 1,
        "MEDIUM": 2,
        "HIGH": 3,
        "CRITICAL": 4,
    }

    training_requirements.sort(
        key=lambda item: (
            priority_rank[
                item["training_priority"]
            ],
            item["predicted_future_skill_gap"],
            item["skill_gap_count"],
            item["demand_count"],
        ),
        reverse=True,
    )

    return {
        "generated_at":
            demand_data["generated_at"],

        "forecast_periods":
            forecast_data["forecast_periods"],

        "total_training_requirements":
            min(
                len(training_requirements),
                limit,
            ),

        "requirements":
            training_requirements[:limit],
    }