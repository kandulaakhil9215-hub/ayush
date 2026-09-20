from __future__ import annotations
from app.models.identity import Industry
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
from app.db.database import Base
from app.models.skills import Skill


class Internship(Base):
    __tablename__ = "internships"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    industry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "industries.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    industry: Mapped["Industry"] = relationship()
    title: Mapped[str] = mapped_column(
        String(250),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    eligibility: Mapped[str | None] = mapped_column(
        Text,
    )

    location: Mapped[str | None] = mapped_column(
        String(250),
    )

    duration: Mapped[str | None] = mapped_column(
        String(100),
    )

    stipend: Mapped[float | None] = mapped_column(
        Float,
    )

    application_deadline: Mapped[datetime | None] = mapped_column(
        DateTime,
    )

    source_url: Mapped[str | None] = mapped_column(
        String(1000),
    )

    official_url: Mapped[str | None] = mapped_column(
        String(1000),
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
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

    required_skills: Mapped[list["OpportunitySkill"]] = relationship(
        back_populates="internship",
        cascade="all, delete-orphan",
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    industry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "industries.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    industry: Mapped["Industry"] = relationship()

    title: Mapped[str] = mapped_column(
        String(250),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
    )

    eligibility: Mapped[str | None] = mapped_column(
        Text,
    )

    location: Mapped[str | None] = mapped_column(
        String(250),
    )

    employment_type: Mapped[str | None] = mapped_column(
        String(100),
    )

    salary_min: Mapped[float | None] = mapped_column(
        Float,
    )

    salary_max: Mapped[float | None] = mapped_column(
        Float,
    )

    application_deadline: Mapped[datetime | None] = mapped_column(
        DateTime,
    )

    source_url: Mapped[str | None] = mapped_column(
        String(1000),
    )

    official_url: Mapped[str | None] = mapped_column(
        String(1000),
    )

    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
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

    required_skills: Mapped[list["OpportunitySkill"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )


class OpportunitySkill(Base):
    __tablename__ = "opportunity_skills"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    internship_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "internships.id",
            ondelete="CASCADE",
        ),
    )

    job_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "jobs.id",
            ondelete="CASCADE",
        ),
    )

    skill_id: Mapped[int] = mapped_column(
        ForeignKey(
            "skills.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    required_score: Mapped[float] = mapped_column(
        Float,
        default=60,
        nullable=False,
    )

    importance_weight: Mapped[float] = mapped_column(
        Float,
        default=1,
        nullable=False,
    )

    internship: Mapped["Internship | None"] = relationship(
        back_populates="required_skills",
    )

    job: Mapped["Job | None"] = relationship(
        back_populates="required_skills",
    )

    skill: Mapped["Skill"] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "internship_id",
            "skill_id",
            name="uq_internship_skill",
        ),
        UniqueConstraint(
            "job_id",
            "skill_id",
            name="uq_job_skill",
        ),
    )