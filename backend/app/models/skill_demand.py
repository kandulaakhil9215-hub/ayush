from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class SkillDemand(Base):
    __tablename__ = "skill_demand"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    demand_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    student_supply_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    skill_gap_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    demand_score: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    growth_rate: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    skill = relationship("Skill")

    __table_args__ = (
        UniqueConstraint(
            "skill_id",
            "period",
            name="uq_skill_demand_period",
        ),
    )