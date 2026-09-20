from pydantic import BaseModel, EmailStr, Field


class StudentRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=150)
    institution_id: int
    student_id: str = Field(min_length=1, max_length=100)
    department: str | None = Field(default=None, max_length=150)
    degree: str | None = Field(default=None, max_length=150)
    graduation_year: int | None = None
    cgpa: float | None = Field(default=None, ge=0, le=10)


class FacultyStudentCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=150)
    student_id: str = Field(min_length=1, max_length=100)
    department: str | None = Field(default=None, max_length=150)
    degree: str | None = Field(default=None, max_length=150)
    graduation_year: int | None = None
    cgpa: float | None = Field(default=None, ge=0, le=10)
