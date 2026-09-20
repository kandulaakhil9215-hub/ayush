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


class InternshipCompletion(Base):
    __tablename__ = "internship_completions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    internship_progress_id: Mapped[int] = mapped_column(
        ForeignKey(
            "internship_progress.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    final_progress_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    final_attendance_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    tasks_completed: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    total_tasks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    mentor_rating: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    mentor_evaluation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    student_report: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    skills_demonstrated: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    strengths: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    areas_for_improvement: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    completion_date: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    verified_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    verification_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    verification_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    certificate_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
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

    internship_progress = relationship(
        "InternshipProgress",
        back_populates="completion",
        uselist=False,
    )

    verifier = relationship(
        "User",
        foreign_keys=[verified_by],
    )