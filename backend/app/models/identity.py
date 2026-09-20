from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column(
        "user_id",
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "role_id",
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(255)
    )

    users: Mapped[list["User"]] = relationship(
        secondary=user_roles,
        back_populates="roles",
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
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

    # Institution linked to an institution administrator
    institution_id: Mapped[int | None] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=True,
    )

    institution: Mapped["Institution | None"] = relationship(
        back_populates="institution_admins",
    )

    roles: Mapped[list["Role"]] = relationship(
        secondary=user_roles,
        back_populates="users",
    )

    student_profile: Mapped["Student | None"] = relationship(
        back_populates="user",
        uselist=False,
    )

    faculty_profile: Mapped["Faculty | None"] = relationship(
        back_populates="user",
        uselist=False,
    )

    industry_profile: Mapped["Industry | None"] = relationship(
        back_populates="user",
        uselist=False,
    )


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    institution_code: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
    )

    institution_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    district: Mapped[str | None] = mapped_column(
        String(100),
    )

    city: Mapped[str | None] = mapped_column(
        String(100),
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    students: Mapped[list["Student"]] = relationship(
        back_populates="institution",
    )

    faculty: Mapped[list["Faculty"]] = relationship(
        back_populates="institution",
    )

    institution_admins: Mapped[list["User"]] = relationship(
        back_populates="institution",
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
    )

    student_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    department: Mapped[str | None] = mapped_column(
        String(150),
    )

    degree: Mapped[str | None] = mapped_column(
        String(150),
    )

    graduation_year: Mapped[int | None] = mapped_column(
        Integer,
    )

    cgpa: Mapped[float | None] = mapped_column()

    user: Mapped["User"] = relationship(
        back_populates="student_profile",
    )

    institution: Mapped["Institution"] = relationship(
        back_populates="students",
    )

    portfolio = relationship(
        "Portfolio",
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Faculty(Base):
    __tablename__ = "faculty"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id"),
        nullable=False,
    )

    employee_id: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
    )

    department: Mapped[str | None] = mapped_column(
        String(150),
    )

    designation: Mapped[str | None] = mapped_column(
        String(150),
    )

    user: Mapped["User"] = relationship(
        back_populates="faculty_profile",
    )

    institution: Mapped["Institution"] = relationship(
        back_populates="faculty",
    )


class Industry(Base):
    __tablename__ = "industries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    company_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    industry_type: Mapped[str | None] = mapped_column(
        String(150),
    )

    website: Mapped[str | None] = mapped_column(
        String(500),
    )

    headquarters: Mapped[str | None] = mapped_column(
        String(255),
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="industry_profile",
    )