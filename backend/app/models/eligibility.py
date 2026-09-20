from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class EligibilityRule(Base):
    __tablename__ = "eligibility_rules"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    industry_id: Mapped[int] = mapped_column(
        ForeignKey("industries.id", ondelete="CASCADE"),
        nullable=False,
    )

    internship_id: Mapped[int | None] = mapped_column(
        ForeignKey("internships.id", ondelete="CASCADE"),
        nullable=True,
    )

    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=True,
    )

    rule_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    skill_id: Mapped[int | None] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=True,
    )

    operator: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    required_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_mandatory: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    internship = relationship("Internship")
    job = relationship("Job")