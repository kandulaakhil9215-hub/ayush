from __future__ import annotations

from statistics import mean

from sqlalchemy.orm import Session

from app.models.skill_demand import SkillDemand
from app.models.skills import Skill


def forecast_skill_demand(
    db: Session,
    forecast_periods: int = 3,
):
    """
    Forecast future AYUSH skill demand.

    Uses historical SkillDemand snapshots when available.

    With limited history, the latest demand becomes
    the baseline and the forecast is marked LOW_CONFIDENCE.
    """

    skills = db.query(Skill).all()

    forecasts = []

    for skill in skills:

        history = (
            db.query(SkillDemand)
            .filter(
                SkillDemand.skill_id == skill.id
            )
            .order_by(
                SkillDemand.period.asc()
            )
            .all()
        )

        if not history:
            continue

        demand_values = [
            float(item.demand_count)
            for item in history
        ]

        latest = history[-1]

        latest_demand = float(
            latest.demand_count
        )

        # -----------------------------------------------------
        # GROWTH CALCULATION
        # -----------------------------------------------------

        if len(demand_values) >= 2:

            previous = demand_values[-2]

            if previous > 0:

                growth_rate = (
                    (latest_demand - previous)
                    / previous
                ) * 100

            elif latest_demand > 0:

                # Demand appeared from a zero baseline.
                # Treat this as a genuine rise.
                growth_rate = 100.0

            else:

                # 0 -> 0 is no growth.
                growth_rate = 0.0

        else:
            growth_rate = 0.0

        # -----------------------------------------------------
        # TREND
        # -----------------------------------------------------

        if latest_demand == 0 and (
            len(demand_values) >= 2
            and demand_values[-2] == 0
        ):

            trend = "STABLE"

        elif growth_rate >= 15:

            trend = "RISING"

        elif growth_rate <= -15:

            trend = "DECLINING"

        else:

            trend = "STABLE"

        # -----------------------------------------------------
        # FORECAST
        # -----------------------------------------------------

        if len(demand_values) >= 3:

            recent_values = demand_values[-3:]

            baseline = mean(
                recent_values
            )

        else:
            baseline = latest_demand

        growth_factor = (
            1 + growth_rate / 100
        )

        predicted_demand = baseline

        for _ in range(forecast_periods):
            predicted_demand *= growth_factor

        predicted_demand = round(
            max(predicted_demand, 0),
            2,
        )

        # -----------------------------------------------------
        # FUTURE GAP
        # -----------------------------------------------------

        current_supply = (
            latest.student_supply_count
            or 0
        )

        predicted_gap = max(
            round(
                predicted_demand
                - current_supply,
                2,
            ),
            0,
        )

        if predicted_gap > 0:

            if predicted_gap >= predicted_demand * 0.75:
                shortage_level = "CRITICAL"

            elif predicted_gap >= predicted_demand * 0.50:
                shortage_level = "HIGH"

            elif predicted_gap >= predicted_demand * 0.25:
                shortage_level = "MEDIUM"

            else:
                shortage_level = "LOW"

        else:
            shortage_level = "NONE"

        # -----------------------------------------------------
        # CONFIDENCE
        # -----------------------------------------------------

        if len(history) >= 6:
            confidence = 85.0

        elif len(history) >= 3:
            confidence = 70.0

        elif len(history) >= 2:
            confidence = 55.0

        else:
            confidence = 35.0

        forecasts.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,

                "latest_demand":
                    latest_demand,

                "student_supply":
                    current_supply,

                "growth_rate":
                    round(growth_rate, 2),

                "trend":
                    trend,

                "forecast_periods":
                    forecast_periods,

                "predicted_future_demand":
                    predicted_demand,

                "predicted_skill_gap":
                    predicted_gap,

                "shortage_level":
                    shortage_level,

                "confidence_score":
                    confidence,

                "historical_observations":
                    len(history),
            }
        )

    forecasts.sort(
        key=lambda item: (
            item["predicted_skill_gap"],
            item["growth_rate"],
        ),
        reverse=True,
    )

    return {
        "forecast_periods": forecast_periods,
        "total_forecasts": len(forecasts),
        "forecasts": forecasts,
    }


def get_future_skill_shortages(
    db: Session,
    limit: int = 10,
):
    forecast = forecast_skill_demand(
        db,
        forecast_periods=3,
    )

    shortages = [
        item
        for item in forecast["forecasts"]
        if item["shortage_level"]
        in {
            "CRITICAL",
            "HIGH",
            "MEDIUM",
        }
    ]

    shortages.sort(
        key=lambda item: (
            item["shortage_level"],
            item["predicted_skill_gap"],
        ),
        reverse=True,
    )

    return {
        "total_shortages": min(
            len(shortages),
            limit,
        ),
        "shortages": shortages[:limit],
    }