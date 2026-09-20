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


class Shortlist(Base):
    __tablename__ = "shortlists"

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

    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    recruitment_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    skill_match_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    assessment_coverage_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    eligibility_status: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    shortlist_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="AUTOMATIC",
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    shortlisted_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    application = relationship(
        "Application",
        back_populates="shortlist",
    )

    shortlisted_by_user = relationship(
        "User",
        foreign_keys=[shortlisted_by],
    )

    __table_args__ = (
        UniqueConstraint(
            "application_id",
            name="uq_shortlist_application",
        ),
    )