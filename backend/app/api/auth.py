from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import (
    User,
    Role,
    Institution,
    Student,
)
from datetime import timedelta

from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_id,

)
from app.core.security import hash_password
from app.schemas.auth import StudentRegisterRequest, FacultyStudentCreateRequest


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# STUDENT REGISTRATION
# ============================================================

@router.post(
    "/register/student",
    status_code=status.HTTP_201_CREATED,
)
def register_student(
    data: StudentRegisterRequest,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # CHECK EMAIL
    # --------------------------------------------------------

    existing_user = db.scalar(
        select(User).where(
            User.email == data.email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered",
        )

    # --------------------------------------------------------
    # CHECK STUDENT ID
    # --------------------------------------------------------

    existing_student = db.scalar(
        select(Student).where(
            Student.student_id == data.student_id
        )
    )

    if existing_student:
        raise HTTPException(
            status_code=400,
            detail="Student ID is already registered",
        )

    # --------------------------------------------------------
    # CHECK INSTITUTION
    # --------------------------------------------------------

    institution = db.get(
        Institution,
        data.institution_id,
    )

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found",
        )

    # --------------------------------------------------------
    # FIND STUDENT ROLE
    # --------------------------------------------------------

    role = db.scalar(
        select(Role).where(
            Role.name == "STUDENT"
        )
    )

    # If the role doesn't exist yet, create it.
    if not role:
        role = Role(
            name="STUDENT",
            description="AYUSH student user",
        )

        db.add(role)
        db.flush()

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    user = User(
        email=data.email,
        password_hash=hash_password(
            data.password
        ),
        full_name=data.full_name,
        is_active=True,
        is_verified=False,
    )

    user.roles.append(role)

    db.add(user)
    db.flush()

    # --------------------------------------------------------
    # CREATE STUDENT PROFILE
    # --------------------------------------------------------

    student = Student(
        user_id=user.id,
        institution_id=data.institution_id,
        student_id=data.student_id,
        department=data.department,
        degree=data.degree,
        graduation_year=data.graduation_year,
        cgpa=data.cgpa,
    )

    db.add(student)

    # --------------------------------------------------------
    # SAVE EVERYTHING
    # --------------------------------------------------------

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create student account",
        )

    db.refresh(user)
    db.refresh(student)

    return {
        "message": "Student registered successfully",

        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": "STUDENT",
            "is_verified": user.is_verified,
        },

        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "institution_id": student.institution_id,
            "department": student.department,
            "degree": student.degree,
            "graduation_year": student.graduation_year,
            "cgpa": student.cgpa,
        },
    }
# ============================================================
# FACULTY CREATES STUDENT
# ============================================================

@router.post(
    "/faculty/students",
    status_code=status.HTTP_201_CREATED,
)
def faculty_create_student(
    data: FacultyStudentCreateRequest,
    current_user: User = Depends(
        require_roles("FACULTY", "ACADEMIAN")
    ),
    db: Session = Depends(get_db),
):
    """Create a student under the logged-in faculty member's institution."""

    faculty = current_user.faculty_profile

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")

    institution_id = faculty.institution_id
    institution = db.get(Institution, institution_id)

    if not institution:
        raise HTTPException(status_code=404, detail="Faculty institution not found")

    if not institution.is_active:
        raise HTTPException(status_code=403, detail="Faculty institution is inactive")

    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=400, detail="Email is already registered")

    if db.scalar(select(Student).where(Student.student_id == data.student_id)):
        raise HTTPException(status_code=400, detail="Student ID is already registered")

    role = db.scalar(select(Role).where(Role.name == "STUDENT"))

    if not role:
        role = Role(name="STUDENT", description="AYUSH student user")
        db.add(role)
        db.flush()

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        is_active=True,
        is_verified=False,
    )
    user.roles.append(role)
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        institution_id=institution_id,
        student_id=data.student_id,
        department=data.department,
        degree=data.degree,
        graduation_year=data.graduation_year,
        cgpa=data.cgpa,
    )
    db.add(student)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to create student account")

    db.refresh(user)
    db.refresh(student)

    return {
        "message": "Student created successfully",
        "created_by_faculty_id": faculty.id,
        "institution": {"id": institution.id, "name": institution.name},
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "roles": [role_item.name for role_item in user.roles],
            "is_active": user.is_active,
            "is_verified": user.is_verified,
        },
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "institution_id": student.institution_id,
            "department": student.department,
            "degree": student.degree,
            "graduation_year": student.graduation_year,
            "cgpa": student.cgpa,
        },
    }


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.email == form_data.username
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    roles = [role.name for role in user.roles]

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
        },
        expires_delta=timedelta(hours=1),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "roles": roles,
            "is_verified": user.is_verified,
            "institution_id": user.institution_id,
        },
    }
@router.get("/me")
def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    roles = [role.name for role in user.roles]

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "roles": roles,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "institution_id": user.institution_id,
    }
@router.get("/student-test")
def student_test(
    user: User = Depends(
        require_roles("STUDENT")
    ),
):
    return {
        "message": "Student access granted",
        "user_id": user.id,
        "email": user.email,
        "roles": [
            role.name
            for role in user.roles
        ],
    }