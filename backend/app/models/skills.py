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
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.identity import User


# ============================================================
# AYUSH SYSTEMS
# ============================================================

class AyushSystem(Base):
    __tablename__ = "ayush_systems"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    skill_categories: Mapped[list["SkillCategory"]] = relationship(
        back_populates="ayush_system",
    )


# ============================================================
# SKILL CATEGORIES
# ============================================================

class SkillCategory(Base):
    __tablename__ = "skill_categories"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    ayush_system_id: Mapped[int] = mapped_column(
        ForeignKey(
            "ayush_systems.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    ayush_system: Mapped["AyushSystem"] = relationship(
        back_populates="skill_categories",
    )

    skills: Mapped[list["Skill"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "ayush_system_id",
            "name",
            name="uq_ayush_skill_category",
        ),
    )


# ============================================================
# SKILLS
# ============================================================

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skill_categories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    category: Mapped["SkillCategory"] = relationship(
        back_populates="skills",
    )

    student_skills: Mapped[list["StudentSkill"]] = relationship(
        back_populates="skill",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "category_id",
            "name",
            name="uq_category_skill",
        ),
    )


# ============================================================
# SKILL LEVELS
# ============================================================

class SkillLevel(Base):
    __tablename__ = "skill_levels"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    min_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    max_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )


# ============================================================
# STUDENT SKILLS
# ============================================================

class StudentSkill(Base):
    __tablename__ = "student_skills"

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

    skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    skill_level_id: Mapped[int | None] = mapped_column(
        ForeignKey("skill_levels.id"),
    )

    score: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    source: Mapped[str | None] = mapped_column(
        String(100),
    )

    last_assessed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
    )

    # ========================================================
    # BASIC VERIFICATION
    # ========================================================

    verified_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    verification_source: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    verification_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ========================================================
    # ENHANCED VERIFICATION WORKFLOW
    # ========================================================

    verification_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    evidence_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    review_due_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    verification_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    verifier: Mapped["User | None"] = relationship(
        foreign_keys=[verified_by],
    )

    skill: Mapped["Skill"] = relationship(
        back_populates="student_skills",
    )

    level: Mapped["SkillLevel | None"] = relationship()

    verification_history: Mapped[
        list["SkillVerificationHistory"]
    ] = relationship(
        back_populates="student_skill",
        cascade="all, delete-orphan",
        order_by="SkillVerificationHistory.created_at.desc()",
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "skill_id",
            name="uq_student_skill",
        ),
    )


# ============================================================
# SKILL VERIFICATION HISTORY
# ============================================================

class SkillVerificationHistory(Base):
    __tablename__ = "skill_verification_history"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    student_skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "student_skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey(
            "students.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    verified_by: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    verification_source: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    verification_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    evidence_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    review_due_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    verification_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    student_skill: Mapped["StudentSkill"] = relationship(
        back_populates="verification_history",
    )

    verifier: Mapped["User | None"] = relationship(
        foreign_keys=[verified_by],
    )