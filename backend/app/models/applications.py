from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
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

    status: Mapped[str] = mapped_column(
        String(40),
        default="APPLIED",
        nullable=False,
    )

    cover_letter: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    resume_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    applied_at: Mapped[datetime] = mapped_column(
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

    status_history: Mapped[list["ApplicationStatusHistory"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusHistory.changed_at",
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "internship_id",
            name="uq_student_internship_application",
        ),
        UniqueConstraint(
            "student_id",
            "job_id",
            name="uq_student_job_application",
        ),
    )
    shortlist = relationship(
    "Shortlist",
    back_populates="application",
    uselist=False,
    cascade="all, delete-orphan",
    )
    internship_progress = relationship(
    "InternshipProgress",
    back_populates="application",
    uselist=False,
    cascade="all, delete-orphan",
    )


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )

    old_status: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
    )

    new_status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    application: Mapped["Application"] = relationship(
        back_populates="status_history"
    )