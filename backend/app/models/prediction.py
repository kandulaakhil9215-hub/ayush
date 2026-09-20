from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    student_id: Mapped[int | None] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    skill_id: Mapped[int | None] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    prediction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    prediction_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    predicted_value: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    predicted_label: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    explanation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    student = relationship("Student")

    skill = relationship("Skill")