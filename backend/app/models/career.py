from __future__ import annotations

from datetime import datetime
from app.models.learning import Course
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
from app.models.skills import Skill


class CareerRole(Base):
    __tablename__ = "career_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    ayush_system_id: Mapped[int | None] = mapped_column(
        ForeignKey("ayush_systems.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    required_skills: Mapped[list["CareerRoleSkill"]] = relationship(
        "CareerRoleSkill",
        back_populates="career_role",
        cascade="all, delete-orphan",
    )

    career_paths: Mapped[list["CareerPath"]] = relationship(
        "CareerPath",
        back_populates="career_role",
        cascade="all, delete-orphan",
    )


class CareerRoleSkill(Base):
    __tablename__ = "career_role_skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    career_role_id: Mapped[int] = mapped_column(
        ForeignKey("career_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    required_score: Mapped[float] = mapped_column(
        Float,
        default=60.0,
        nullable=False,
    )

    importance_weight: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
    )

    career_role: Mapped["CareerRole"] = relationship(
        "CareerRole",
        back_populates="required_skills",
    )

    skill: Mapped["Skill"] = relationship("Skill")

    __table_args__ = (
        UniqueConstraint(
            "career_role_id",
            "skill_id",
            name="uq_career_role_skill",
        ),
    )


class CareerPath(Base):
    __tablename__ = "career_paths"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    career_role_id: Mapped[int] = mapped_column(
        ForeignKey("career_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    career_role: Mapped["CareerRole"] = relationship(
        "CareerRole",
        back_populates="career_paths",
    )

    steps: Mapped[list["CareerPathStep"]] = relationship(
        "CareerPathStep",
        back_populates="career_path",
        cascade="all, delete-orphan",
        order_by="CareerPathStep.step_order",
    )


class CareerPathStep(Base):
    __tablename__ = "career_path_steps"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    career_path_id: Mapped[int] = mapped_column(
        ForeignKey("career_paths.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    step_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    step_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    skill_id: Mapped[int | None] = mapped_column(
        ForeignKey("skills.id", ondelete="SET NULL"),
        nullable=True,
    )

    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
    )

    duration_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    target_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    career_path: Mapped["CareerPath"] = relationship(
        "CareerPath",
        back_populates="steps",
    )

    skill: Mapped["Skill | None"] = relationship(
        "Skill",
    )

    course: Mapped["Course | None"] = relationship(
        "Course",
    )

    __table_args__ = (
        UniqueConstraint(
            "career_path_id",
            "step_order",
            name="uq_career_path_step_order",
        ),
    )