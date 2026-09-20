from datetime import datetime

from passlib.context import CryptContext
from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.identity import User, Student, Role, Institution
from app.models.skills import Skill, SkillLevel, StudentSkill


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


STUDENTS = [
    {
        "email": "student2@ayush.com",
        "full_name": "Priya Sharma",
        "student_id": "AYUSH-STU-002",
        "department": "Kayachikitsa",
        "degree": "BAMS",
        "graduation_year": 2027,
        "cgpa": 8.7,
        "skills": {
            "Kayachikitsa": 88,
            "Panchakarma": 82,
            "Dravyaguna": 76,
            "Clinical Research": 72,
            "Research Methodology": 68,
            "Communication": 84,
        },
    },
    {
        "email": "student3@ayush.com",
        "full_name": "Rahul Reddy",
        "student_id": "AYUSH-STU-003",
        "department": "Panchakarma",
        "degree": "BAMS",
        "graduation_year": 2027,
        "cgpa": 8.1,
        "skills": {
            "Kayachikitsa": 74,
            "Panchakarma": 91,
            "Dravyaguna": 71,
            "Clinical Research": 65,
            "Research Methodology": 61,
            "Communication": 76,
        },
    },
    {
        "email": "student4@ayush.com",
        "full_name": "Sneha Rao",
        "student_id": "AYUSH-STU-004",
        "department": "Dravyaguna",
        "degree": "BAMS",
        "graduation_year": 2028,
        "cgpa": 8.9,
        "skills": {
            "Kayachikitsa": 79,
            "Panchakarma": 69,
            "Dravyaguna": 93,
            "Clinical Research": 81,
            "Research Methodology": 87,
            "Communication": 90,
        },
    },
    {
        "email": "student5@ayush.com",
        "full_name": "Vikram Singh",
        "student_id": "AYUSH-STU-005",
        "department": "Clinical Sciences",
        "degree": "BAMS",
        "graduation_year": 2028,
        "cgpa": 7.8,
        "skills": {
            "Kayachikitsa": 67,
            "Panchakarma": 63,
            "Dravyaguna": 70,
            "Clinical Research": 58,
            "Research Methodology": 54,
            "Communication": 73,
        },
    },
]


def get_skill_level(score: float, levels):
    for level in levels:
        if level.min_score <= score <= level.max_score:
            return level

    return None


def get_skill_by_name(db, skill_name: str):
    return db.scalar(
        select(Skill).where(
            Skill.name == skill_name
        )
    )


def seed_students():
    db = SessionLocal()

    try:
        # --------------------------------------------------
        # EXISTING ROLE
        # --------------------------------------------------

        student_role = db.scalar(
            select(Role).where(
                Role.name == "STUDENT"
            )
        )

        if not student_role:
            raise RuntimeError(
                "STUDENT role does not exist. "
                "Run seed_roles.py first."
            )

        # --------------------------------------------------
        # EXISTING INSTITUTION
        # --------------------------------------------------

        institution = db.scalar(
            select(Institution).where(
                Institution.institution_code == "AYUSH-TEST-001"
            )
        )

        if not institution:
            institution = db.scalar(
                select(Institution).where(
                    Institution.name == "AYUSH Test Institution"
                )
            )

        if not institution:
            raise RuntimeError(
                "AYUSH Test Institution was not found."
            )

        # --------------------------------------------------
        # SKILL LEVELS
        # --------------------------------------------------

        levels = db.scalars(
            select(SkillLevel)
        ).all()

        if not levels:
            raise RuntimeError(
                "No skill levels found. "
                "Run seed_ayush.py first."
            )

        level_by_name = {
            level.name: level
            for level in levels
        }

        # --------------------------------------------------
        # CREATE STUDENTS
        # --------------------------------------------------

        added_students = 0
        existing_students = 0
        added_skills = 0
        existing_skills = 0

        for data in STUDENTS:

            # ----------------------------------------------
            # Check student profile first
            # ----------------------------------------------

            student = db.scalar(
                select(Student).where(
                    Student.student_id == data["student_id"]
                )
            )

            if student:
                existing_students += 1

                user = db.get(
                    User,
                    student.user_id,
                )

            else:

                # ------------------------------------------
                # Check whether email already exists
                # ------------------------------------------

                user = db.scalar(
                    select(User).where(
                        User.email == data["email"]
                    )
                )

                if user:
                    # A user exists but has no student profile.
                    # Reuse that user safely.
                    student = db.scalar(
                        select(Student).where(
                            Student.user_id == user.id
                        )
                    )

                    if student:
                        existing_students += 1
                        continue

                else:
                    user = User(
                        email=data["email"],
                        password_hash=pwd_context.hash(
                            "Student@123"
                        ),
                        full_name=data["full_name"],
                        is_active=True,
                        is_verified=True,
                    )

                    user.roles.append(student_role)

                    db.add(user)
                    db.flush()

                # ------------------------------------------
                # Make sure STUDENT role exists for user
                # ------------------------------------------

                if student_role not in user.roles:
                    user.roles.append(student_role)

                # ------------------------------------------
                # Create student profile
                # ------------------------------------------

                student = Student(
                    user_id=user.id,
                    institution_id=institution.id,
                    student_id=data["student_id"],
                    department=data["department"],
                    degree=data["degree"],
                    graduation_year=data["graduation_year"],
                    cgpa=data["cgpa"],
                )

                db.add(student)
                db.flush()

                added_students += 1

            # --------------------------------------------------
            # STUDENT SKILLS
            # --------------------------------------------------

            for skill_name, score in data["skills"].items():

                skill = get_skill_by_name(
                    db,
                    skill_name,
                )

                if not skill:
                    print(
                        f"WARNING: Skill not found: "
                        f"{skill_name}"
                    )
                    continue

                existing_student_skill = db.scalar(
                    select(StudentSkill).where(
                        StudentSkill.student_id == student.id,
                        StudentSkill.skill_id == skill.id,
                    )
                )

                if existing_student_skill:
                    existing_skills += 1
                    continue

                level = get_skill_level(
                    float(score),
                    levels,
                )

                # Scores are treated as assessed demo records.
                student_skill = StudentSkill(
                    student_id=student.id,
                    skill_id=skill.id,
                    skill_level_id=(
                        level.id if level else None
                    ),
                    score=float(score),
                    verified=False,
                    source="DEMO_ASSESSMENT",
                    last_assessed_at=datetime.utcnow(),
                )

                db.add(student_skill)
                added_skills += 1

        db.commit()

        # --------------------------------------------------
        # SUMMARY
        # --------------------------------------------------

        total_students = db.query(Student).count()

        print("=" * 55)
        print("AYUSH STUDENT DEMO DATA SEEDED SUCCESSFULLY")
        print("=" * 55)
        print(f"Students added       : {added_students}")
        print(f"Students already     : {existing_students}")
        print(f"Skills added         : {added_skills}")
        print(f"Skills already       : {existing_skills}")
        print(f"Institution          : {institution.name}")
        print(f"Total students       : {total_students}")
        print("=" * 55)
        print("Demo student password: Student@123")
        print("=" * 55)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_students()