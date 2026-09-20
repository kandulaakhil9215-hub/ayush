from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.career import CareerRole, CareerRoleSkill
from app.models.skills import Skill
from app.models.skills import AyushSystem


CAREERS = [
    {
        "name": "Panchakarma Specialist",
        "description": "AYUSH professional specializing in Panchakarma therapies and clinical procedures.",
        "system": "Ayurveda",
        "skills": [
            ("Panchakarma", 75, 1.5),
            ("Kayachikitsa", 65, 1.2),
            ("Dravyaguna", 60, 1.0),
        ],
    },
    {
        "name": "Ayurvedic Clinical Practitioner",
        "description": "AYUSH professional providing Ayurvedic clinical assessment, diagnosis and treatment.",
        "system": "Ayurveda",
        "skills": [
            ("Kayachikitsa", 75, 1.5),
            ("Dravyaguna", 70, 1.2),
            ("Panchakarma", 60, 1.0),
        ],
    },
    {
        "name": "Ayurvedic Pharmacist",
        "description": "Professional involved in Ayurvedic medicine preparation, pharmacy and materia medica.",
        "system": "Ayurveda",
        "skills": [
            ("Dravyaguna", 75, 1.5),
            ("Rasashastra", 70, 1.3),
            ("Bhaishajya Kalpana", 75, 1.5),
        ],
    },
    {
        "name": "Clinical Research Associate - AYUSH",
        "description": "Professional supporting clinical research, evidence generation and research activities in AYUSH.",
        "system": "Ayurveda",
        "skills": [
            ("Kayachikitsa", 60, 1.0),
            ("Clinical Research", 70, 1.5),
            ("Research Methodology", 70, 1.5),
        ],
    },
    {
        "name": "Yoga Therapist",
        "description": "Professional providing therapeutic yoga interventions for health and wellness.",
        "system": "Yoga & Naturopathy",
        "skills": [
            ("Yoga Therapy", 75, 1.5),
            ("Therapeutic Yoga", 75, 1.5),
            ("Yoga Anatomy", 65, 1.2),
        ],
    },
    {
        "name": "Naturopathy Therapist",
        "description": "Professional providing naturopathy-based therapeutic and lifestyle interventions.",
        "system": "Yoga & Naturopathy",
        "skills": [
            ("Naturopathy Principles", 75, 1.5),
            ("Naturopathy Therapies", 75, 1.5),
            ("Diet & Lifestyle Management", 70, 1.2),
        ],
    },
    {
        "name": "Unani Clinical Practitioner",
        "description": "Professional providing Unani clinical assessment and therapeutic care.",
        "system": "Unani",
        "skills": [
            ("Moalajat", 75, 1.5),
            ("Ilmul Advia", 70, 1.2),
            ("Tahaffuzi wa Samaji Tib", 65, 1.0),
        ],
    },
    {
        "name": "Siddha Clinical Practitioner",
        "description": "Professional providing Siddha clinical assessment and traditional therapeutic care.",
        "system": "Siddha",
        "skills": [
            ("Maruthuvam", 75, 1.5),
            ("Varmam", 70, 1.2),
            ("Siddha Diagnosis", 70, 1.3),
        ],
    },
    {
        "name": "Homoeopathic Practitioner",
        "description": "Professional providing Homoeopathic case taking, analysis and clinical care.",
        "system": "Homoeopathy",
        "skills": [
            ("Materia Medica", 75, 1.5),
            ("Organon of Medicine", 70, 1.3),
            ("Case Taking", 75, 1.5),
        ],
    },
    {
        "name": "AYUSH Healthcare Manager",
        "description": "Professional managing operations, services and coordination in AYUSH healthcare organizations.",
        "system": "Ayurveda",
        "skills": [
            ("AYUSH Hospital Management", 70, 1.5),
            ("Communication", 65, 1.0),
            ("Leadership", 65, 1.2),
        ],
    },
]


def seed_careers():
    db: Session = SessionLocal()

    try:
        created_roles = 0
        created_requirements = 0

        for career in CAREERS:

            existing_role = (
                db.query(CareerRole)
                .filter(CareerRole.name == career["name"])
                .first()
            )

            if existing_role:
                print(f"SKIPPED: {career['name']}")
                continue

            ayush_system = (
                db.query(AyushSystem)
                .filter(AyushSystem.name == career["system"])
                .first()
            )

            if not ayush_system:
                print(
                    f"SKIPPED: {career['name']} "
                    f"(AYUSH system '{career['system']}' not found)"
                )
                continue

            role = CareerRole(
                name=career["name"],
                description=career["description"],
                ayush_system_id=ayush_system.id,
                is_active=True,
            )

            db.add(role)
            db.flush()

            for skill_name, required_score, weight in career["skills"]:

                skill = (
                    db.query(Skill)
                    .filter(Skill.name == skill_name)
                    .first()
                )

                if not skill:
                    print(
                        f"WARNING: Skill '{skill_name}' "
                        f"not found for '{career['name']}'"
                    )
                    continue

                requirement = CareerRoleSkill(
                    career_role_id=role.id,
                    skill_id=skill.id,
                    required_score=required_score,
                    importance_weight=weight,
                )

                db.add(requirement)
                created_requirements += 1

            created_roles += 1

        db.commit()

        print()
        print("========================================")
        print("AYUSH CAREER ROLE SEED COMPLETED")
        print("========================================")
        print(f"Career roles created      : {created_roles}")
        print(f"Skill requirements created: {created_requirements}")
        print("========================================")

    except Exception as exc:
        db.rollback()
        print("SEED FAILED")
        print(exc)

    finally:
        db.close()


if __name__ == "__main__":
    seed_careers()