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
from app.models.identity import Student
from app.models.career import CareerRole
from app.models.skills import Skill


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey(
            "students.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    career_role_id: Mapped[int] = mapped_column(
        ForeignKey(
            "career_roles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    current_score: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    required_score: Mapped[float] = mapped_column(
        Float,
        default=60,
        nullable=False,
    )

    gap_score: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    calculated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    student: Mapped[Student] = relationship()

    career_role: Mapped[CareerRole] = relationship()

    skill: Mapped[Skill] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "career_role_id",
            "skill_id",
            name="uq_student_career_skill_gap",
        ),
    )