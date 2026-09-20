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
from app.models.skills import (
    Skill,
    SkillLevel,
)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    assessment_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    ayush_system_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "ayush_systems.id",
            ondelete="SET NULL",
        )
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

    versions: Mapped[list["AssessmentVersion"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class AssessmentVersion(Base):
    __tablename__ = "assessment_versions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey(
            "assessments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    instructions: Mapped[str | None] = mapped_column(
        Text,
    )

    passing_score: Mapped[float] = mapped_column(
        Float,
        default=40,
        nullable=False,
    )

    duration_minutes: Mapped[int | None] = mapped_column(
        Integer,
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

    assessment: Mapped["Assessment"] = relationship(
        back_populates="versions",
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="assessment_version",
        cascade="all, delete-orphan",
    )

    attempts: Mapped[list["AssessmentAttempt"]] = relationship(
        back_populates="assessment_version",
    )

    __table_args__ = (
        UniqueConstraint(
            "assessment_id",
            "version_number",
            name="uq_assessment_version",
        ),
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    assessment_version_id: Mapped[int] = mapped_column(
        ForeignKey(
            "assessment_versions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    question_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    options: Mapped[str | None] = mapped_column(
        Text,
    )

    correct_answer: Mapped[str | None] = mapped_column(
        String(500),
    )

    difficulty: Mapped[str] = mapped_column(
        String(50),
        default="MEDIUM",
        nullable=False,
    )

    marks: Mapped[float] = mapped_column(
        Float,
        default=1,
        nullable=False,
    )

    explanation: Mapped[str | None] = mapped_column(
        Text,
    )

    assessment_version: Mapped["AssessmentVersion"] = relationship(
        back_populates="questions",
    )

    question_skills: Mapped[list["QuestionSkill"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
    )

    answers: Mapped[list["AssessmentAnswer"]] = relationship(
        back_populates="question",
    )


class QuestionSkill(Base):
    __tablename__ = "question_skills"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey(
            "questions.id",
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

    weight: Mapped[float] = mapped_column(
        Float,
        default=1,
        nullable=False,
    )

    question: Mapped["Question"] = relationship(
        back_populates="question_skills",
    )

    skill: Mapped["Skill"] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "skill_id",
            name="uq_question_skill",
        ),
    )


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

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

    assessment_version_id: Mapped[int] = mapped_column(
        ForeignKey(
            "assessment_versions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="IN_PROGRESS",
        nullable=False,
    )

    total_score: Mapped[float | None] = mapped_column(
        Float,
    )

    percentage: Mapped[float | None] = mapped_column(
        Float,
    )

    passed: Mapped[bool | None] = mapped_column(
        Boolean,
    )

    assessment_version: Mapped["AssessmentVersion"] = relationship(
        back_populates="attempts",
    )

    answers: Mapped[list["AssessmentAnswer"]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
    )

    results: Mapped[list["AssessmentResult"]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    attempt_id: Mapped[int] = mapped_column(
        ForeignKey(
            "assessment_attempts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey(
            "questions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    selected_answer: Mapped[str | None] = mapped_column(
        String(500),
    )

    is_correct: Mapped[bool | None] = mapped_column(
        Boolean,
    )

    marks_obtained: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    attempt: Mapped["AssessmentAttempt"] = relationship(
        back_populates="answers",
    )

    question: Mapped["Question"] = relationship(
        back_populates="answers",
    )

    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_attempt_question",
        ),
    )


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    attempt_id: Mapped[int] = mapped_column(
        ForeignKey(
            "assessment_attempts.id",
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

    score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    level_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "skill_levels.id",
        )
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    attempt: Mapped["AssessmentAttempt"] = relationship(
        back_populates="results",
    )

    skill: Mapped["Skill"] = relationship()

    level: Mapped["SkillLevel | None"] = relationship()