from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.skill_demand import SkillDemand
from app.services.skill_demand_engine import calculate_skill_demand


def save_skill_demand_snapshot(
    db: Session,
    period: str,
):
    """
    Calculate and persist a skill-demand snapshot
    for the specified period.

    Period format:
        YYYY-MM
    """

    # ---------------------------------------------------------
    # VALIDATE PERIOD
    # ---------------------------------------------------------

    try:
        datetime.strptime(period, "%Y-%m")
    except ValueError:
        raise ValueError(
            "Period must use YYYY-MM format"
        )

    # ---------------------------------------------------------
    # CALCULATE CURRENT DEMAND
    # ---------------------------------------------------------

    demand_data = calculate_skill_demand(
        db,
        period=period,
    )

    results = demand_data["results"]

    created_count = 0
    updated_count = 0

    # ---------------------------------------------------------
    # SAVE SNAPSHOTS
    # ---------------------------------------------------------

    for item in results:

        existing = (
            db.query(SkillDemand)
            .filter(
                SkillDemand.skill_id == item["skill_id"],
                SkillDemand.period == period,
            )
            .first()
        )

        # -----------------------------------------------------
        # UPDATE EXISTING SNAPSHOT
        # -----------------------------------------------------

        if existing:

            existing.demand_count = (
                item["demand_count"]
            )

            existing.student_supply_count = (
                item["student_supply_count"]
            )

            existing.skill_gap_count = (
                item["skill_gap_count"]
            )

            existing.demand_score = (
                item["demand_score"]
            )

            updated_count += 1

        # -----------------------------------------------------
        # CREATE NEW SNAPSHOT
        # -----------------------------------------------------

        else:

            snapshot = SkillDemand(
                skill_id=item["skill_id"],
                period=period,
                demand_count=item["demand_count"],
                student_supply_count=(
                    item["student_supply_count"]
                ),
                skill_gap_count=(
                    item["skill_gap_count"]
                ),
                demand_score=(
                    item["demand_score"]
                ),
                growth_rate=0.0,
            )

            db.add(snapshot)

            created_count += 1

    # ---------------------------------------------------------
    # CALCULATE GROWTH RATES
    # ---------------------------------------------------------

    db.flush()

    for item in results:

        current = (
            db.query(SkillDemand)
            .filter(
                SkillDemand.skill_id == item["skill_id"],
                SkillDemand.period == period,
            )
            .first()
        )

        if not current:
            continue

        previous = (
            db.query(SkillDemand)
            .filter(
                SkillDemand.skill_id
                == item["skill_id"],
                SkillDemand.period < period,
            )
            .order_by(
                SkillDemand.period.desc()
            )
            .first()
        )

        if previous and previous.demand_count > 0:

            current.growth_rate = round(
                (
                    (
                        current.demand_count
                        - previous.demand_count
                    )
                    / previous.demand_count
                )
                * 100,
                2,
            )

        else:

            current.growth_rate = 0.0

    # ---------------------------------------------------------
    # COMMIT
    # ---------------------------------------------------------

    db.commit()

    return {
        "message": "Skill demand snapshot saved successfully",
        "period": period,
        "total_skills": len(results),
        "created": created_count,
        "updated": updated_count,
    }
def generate_demo_demand_history(
    db: Session,
):
    """
    Generate clearly marked DEMO historical skill-demand
    snapshots for forecasting development/testing.

    These values are derived from the current database demand
    baseline and must not be presented as real historical
    AYUSH statistics.
    """

    periods = [
        "2026-04",
        "2026-05",
        "2026-06",
        "2026-07",
        "2026-08",
    ]

    # Current real database-derived demand baseline
    current_data = calculate_skill_demand(
        db,
        period="CURRENT",
    )

    current_results = current_data["results"]

    # Growth multipliers used ONLY for demo forecasting data.
    multipliers = {
        "2026-04": 0.55,
        "2026-05": 0.65,
        "2026-06": 0.75,
        "2026-07": 0.85,
        "2026-08": 0.93,
    }

    created = 0
    updated = 0

    for period in periods:

        multiplier = multipliers[period]

        for item in current_results:

            existing = (
                db.query(SkillDemand)
                .filter(
                    SkillDemand.skill_id
                    == item["skill_id"],
                    SkillDemand.period
                    == period,
                )
                .first()
            )

            # Scale the current demand baseline.
            base_demand = item["demand_count"]

            if base_demand > 0:
                demand_count = max(
                    1,
                    round(
                        base_demand * multiplier
                    ),
                )
            else:
                demand_count = 0

            # Scale student supply slightly more slowly.
            base_supply = item[
                "student_supply_count"
            ]

            student_supply = max(
                0,
                round(
                    base_supply
                    * (
                        0.80
                        + multiplier * 0.20
                    )
                ),
            )

            skill_gap = max(
                demand_count - student_supply,
                0,
            )

            demand_score = round(
                item["demand_score"]
                * multiplier,
                2,
            )

            if existing:

                existing.demand_count = (
                    demand_count
                )

                existing.student_supply_count = (
                    student_supply
                )

                existing.skill_gap_count = (
                    skill_gap
                )

                existing.demand_score = (
                    demand_score
                )

                updated += 1

            else:

                snapshot = SkillDemand(
                    skill_id=item["skill_id"],
                    period=period,
                    demand_count=demand_count,
                    student_supply_count=(
                        student_supply
                    ),
                    skill_gap_count=skill_gap,
                    demand_score=demand_score,
                    growth_rate=0.0,
                )

                db.add(snapshot)

                created += 1

    db.commit()

    return {
        "message": (
            "DEMO skill demand history "
            "generated successfully"
        ),
        "warning": (
            "These snapshots are simulated "
            "development data and are not "
            "real historical AYUSH statistics."
        ),
        "periods": periods,
        "total_periods": len(periods),
        "created": created,
        "updated": updated,
    }