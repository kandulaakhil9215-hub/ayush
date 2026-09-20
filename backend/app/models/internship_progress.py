from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class InternshipProgress(Base):
    __tablename__ = "internship_progress"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    mentor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    start_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    end_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="NOT_STARTED",
    )

    progress_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    tasks_completed: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    total_tasks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    attendance_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    student_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    mentor_notes: Mapped[str | None] = mapped_column(
        Text,
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

    application = relationship(
        "Application",
        back_populates="internship_progress",
    )

    mentor = relationship(
        "User",
        foreign_keys=[mentor_id],
    )
    completion = relationship(
        "InternshipCompletion",
        back_populates="internship_progress",
        uselist=False,
        cascade="all, delete-orphan",
    )