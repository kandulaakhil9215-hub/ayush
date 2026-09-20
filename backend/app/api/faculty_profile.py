from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Faculty, User, Institution


router = APIRouter(
    prefix="/api/faculty/profile",
    tags=["Faculty Profile"],
)


class FacultyProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    employee_id: str | None = None
    department: str | None = None
    designation: str | None = None
    institution_id: int
    is_verified: bool


class FacultyProfileUpdateRequest(BaseModel):
    employee_id: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=150)
    designation: str | None = Field(default=None, max_length=150)


class AdminFacultyResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    employee_id: str | None = None
    department: str | None = None
    designation: str | None = None
    institution_id: int
    institution_name: str | None = None
    is_active: bool
    is_verified: bool


@router.get(
    "",
    response_model=FacultyProfileResponse,
)
def get_faculty_profile(
    current_user: User = Depends(require_roles("FACULTY", "ACADEMIAN")),
    db: Session = Depends(get_db),
):
    faculty = (
        db.query(Faculty)
        .filter(Faculty.user_id == current_user.id)
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found",
        )

    return FacultyProfileResponse(
        id=faculty.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        employee_id=faculty.employee_id,
        department=faculty.department,
        designation=faculty.designation,
        institution_id=faculty.institution_id,
        is_verified=current_user.is_verified,
    )


@router.patch(
    "",
    response_model=FacultyProfileResponse,
)
def update_faculty_profile(
    data: FacultyProfileUpdateRequest,
    current_user: User = Depends(require_roles("FACULTY", "ACADEMIAN")),
    db: Session = Depends(get_db),
):
    faculty = (
        db.query(Faculty)
        .filter(Faculty.user_id == current_user.id)
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found",
        )

    if data.employee_id is not None:
        duplicate = (
            db.query(Faculty)
            .filter(
                Faculty.employee_id == data.employee_id,
                Faculty.id != faculty.id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee ID already exists",
            )

    faculty.employee_id = data.employee_id
    faculty.department = data.department
    faculty.designation = data.designation

    db.commit()
    db.refresh(faculty)

    return FacultyProfileResponse(
        id=faculty.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        employee_id=faculty.employee_id,
        department=faculty.department,
        designation=faculty.designation,
        institution_id=faculty.institution_id,
        is_verified=current_user.is_verified,
    )


@router.get(
    "/admin",
    response_model=list[AdminFacultyResponse],
)
def get_admin_faculty(
    current_user: User = Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    faculty_records = (
        db.query(Faculty, User, Institution)
        .join(User, Faculty.user_id == User.id)
        .join(Institution, Faculty.institution_id == Institution.id)
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        AdminFacultyResponse(
            id=faculty.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            employee_id=faculty.employee_id,
            department=faculty.department,
            designation=faculty.designation,
            institution_id=faculty.institution_id,
            institution_name=institution.name,
            is_active=user.is_active,
            is_verified=user.is_verified,
        )
        for faculty, user, institution in faculty_records
    ]