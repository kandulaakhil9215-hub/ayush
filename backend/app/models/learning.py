from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    provider: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
    )

    course_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="COURSE",
    )

    difficulty_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="BEGINNER",
    )

    duration_hours: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    certification_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    source_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    official_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
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

    skills = relationship(
        "CourseSkill",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class CourseSkill(Base):
    __tablename__ = "course_skills"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    target_level: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    coverage_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=100.0,
    )

    importance_weight: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )

    course = relationship(
        "Course",
        back_populates="skills",
    )

    skill = relationship(
        "Skill",
    )

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "skill_id",
            name="uq_course_skill",
        ),
    )