from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.learning import Course, CourseSkill
from app.models.skills import Skill


COURSES = [
    {
        "title": "Advanced Panchakarma Clinical Practice",
        "description": "Practical learning program covering Panchakarma procedures, patient preparation, clinical protocols, and documentation.",
        "provider": "AYUSH Clinical Learning Centre",
        "course_type": "TRAINING",
        "difficulty_level": "ADVANCED",
        "duration_hours": 40,
        "certification_available": True,
        "verified": True,
        "skills": ["Panchakarma", "Snehana", "Swedana"],
    },
    {
        "title": "Foundations of Kayachikitsa",
        "description": "Clinical learning program focused on diagnosis, treatment planning, and practical application of Kayachikitsa principles.",
        "provider": "AYUSH Clinical Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 30,
        "certification_available": True,
        "verified": True,
        "skills": ["Kayachikitsa"],
    },
    {
        "title": "Dravyaguna Materia Medica",
        "description": "Structured learning program covering medicinal plants, pharmacological properties, identification, and clinical applications.",
        "provider": "AYUSH Academic Training Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 35,
        "certification_available": True,
        "verified": True,
        "skills": ["Dravyaguna"],
    },
    {
        "title": "Clinical Research in AYUSH",
        "description": "Introduction to clinical research design, evidence generation, clinical trials, documentation, and research practices in AYUSH.",
        "provider": "AYUSH Research Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 25,
        "certification_available": True,
        "verified": True,
        "skills": ["Clinical Research", "Research Methodology"],
    },
    {
        "title": "Research Methodology for AYUSH Professionals",
        "description": "Practical training in research questions, study design, data collection, analysis, interpretation, and scientific reporting.",
        "provider": "AYUSH Research Learning Centre",
        "course_type": "TRAINING",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 20,
        "certification_available": True,
        "verified": True,
        "skills": ["Research Methodology"],
    },
    {
        "title": "AYUSH Hospital Management",
        "description": "Training covering healthcare administration, patient workflow, documentation, quality processes, and AYUSH hospital operations.",
        "provider": "Integrated AYUSH Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 28,
        "certification_available": True,
        "verified": True,
        "skills": ["AYUSH Hospital Management"],
    },
    {
        "title": "Therapeutic Yoga Practice",
        "description": "Practical program covering therapeutic yoga principles, assessment, sequencing, and application in wellness settings.",
        "provider": "AYUSH Yoga Learning Centre",
        "course_type": "TRAINING",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 32,
        "certification_available": True,
        "verified": True,
        "skills": ["Yoga Therapy", "Therapeutic Yoga"],
    },
    {
        "title": "Unani Clinical Practice",
        "description": "Foundational clinical training covering assessment, treatment planning, and practical Unani healthcare concepts.",
        "provider": "AYUSH Unani Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 30,
        "certification_available": True,
        "verified": True,
        "skills": ["Moalajat"],
    },
    {
        "title": "Siddha Clinical Foundations",
        "description": "Learning program introducing Siddha clinical concepts, diagnosis, treatment principles, and practical applications.",
        "provider": "AYUSH Siddha Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 30,
        "certification_available": True,
        "verified": True,
        "skills": ["Maruthuvam", "Siddha Diagnosis"],
    },
    {
        "title": "Homoeopathic Clinical Practice",
        "description": "Clinical learning program covering case taking, repertory use, materia medica, and practical homoeopathic practice.",
        "provider": "AYUSH Homoeopathy Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "INTERMEDIATE",
        "duration_hours": 30,
        "certification_available": True,
        "verified": True,
        "skills": ["Homoeopathic Clinical Practice", "Case Taking"],
    },
    {
        "title": "Sowa-Rigpa Traditional Medicine",
        "description": "Foundational program covering traditional medicine concepts, diagnosis, and pharmacological principles within Sowa-Rigpa.",
        "provider": "AYUSH Sowa-Rigpa Learning Centre",
        "course_type": "COURSE",
        "difficulty_level": "BEGINNER",
        "duration_hours": 24,
        "certification_available": True,
        "verified": True,
        "skills": ["Traditional Medicine", "Sowa-Rigpa Diagnosis"],
    },
]


def get_skill_map(db: Session):
    skills = db.query(Skill).all()

    return {
        skill.name.strip().lower(): skill
        for skill in skills
    }


def seed_courses():
    db = SessionLocal()

    try:
        skill_map = get_skill_map(db)

        created_courses = 0
        created_mappings = 0

        for course_data in COURSES:
            existing_course = (
                db.query(Course)
                .filter(
                    Course.title == course_data["title"]
                )
                .first()
            )

            if existing_course:
                course = existing_course
            else:
                course = Course(
                    title=course_data["title"],
                    description=course_data["description"],
                    provider=course_data["provider"],
                    course_type=course_data["course_type"],
                    difficulty_level=course_data["difficulty_level"],
                    duration_hours=course_data["duration_hours"],
                    certification_available=course_data[
                        "certification_available"
                    ],
                    verified=course_data["verified"],
                    status="ACTIVE",
                )

                db.add(course)
                db.flush()

                created_courses += 1

            for skill_name in course_data["skills"]:
                skill = skill_map.get(
                    skill_name.strip().lower()
                )

                if not skill:
                    print(
                        f"WARNING: Skill not found: {skill_name}"
                    )
                    continue

                existing_mapping = (
                    db.query(CourseSkill)
                    .filter(
                        CourseSkill.course_id == course.id,
                        CourseSkill.skill_id == skill.id,
                    )
                    .first()
                )

                if existing_mapping:
                    continue

                mapping = CourseSkill(
                    course_id=course.id,
                    skill_id=skill.id,
                    target_level=3,
                    coverage_percentage=100.0,
                    importance_weight=1.0,
                )

                db.add(mapping)
                created_mappings += 1

        db.commit()

        print(
            f"Courses created: {created_courses}"
        )
        print(
            f"Course-skill mappings created: "
            f"{created_mappings}"
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_courses()