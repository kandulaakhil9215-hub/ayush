from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.skills import AyushSystem, SkillCategory, Skill, SkillLevel


AYUSH_SYSTEMS = [
    {
        "name": "Ayurveda",
        "code": "AYU",
        "description": "Traditional Indian system of medicine based on Ayurveda principles.",
    },
    {
        "name": "Yoga & Naturopathy",
        "code": "YOG",
        "description": "AYUSH system covering Yoga and Naturopathy practices.",
    },
    {
        "name": "Unani",
        "code": "UNA",
        "description": "Traditional system of medicine practiced within the AYUSH ecosystem.",
    },
    {
        "name": "Siddha",
        "code": "SID",
        "description": "Traditional South Indian system of medicine.",
    },
    {
        "name": "Homoeopathy",
        "code": "HOM",
        "description": "Homoeopathy system within the AYUSH ecosystem.",
    },
    {
        "name": "Sowa-Rigpa",
        "code": "SOR",
        "description": "Traditional Himalayan system of medicine.",
    },
]


SKILL_LEVELS = [
    {
        "name": "Beginner",
        "min_score": 0,
        "max_score": 39.99,
        "description": "Basic introductory understanding.",
    },
    {
        "name": "Intermediate",
        "min_score": 40,
        "max_score": 59.99,
        "description": "Developing practical and theoretical understanding.",
    },
    {
        "name": "Proficient",
        "min_score": 60,
        "max_score": 79.99,
        "description": "Good working knowledge and practical capability.",
    },
    {
        "name": "Advanced",
        "min_score": 80,
        "max_score": 94.99,
        "description": "Strong knowledge and practical capability.",
    },
    {
        "name": "Expert",
        "min_score": 95,
        "max_score": 100,
        "description": "Highly developed competency.",
    },
]


SKILL_DATA = {
        "Ayurveda": {
            "Professional & Research Skills": [
            "Clinical Research",
            "Research Methodology",
            "AYUSH Hospital Management",
            "Communication",
            "Leadership",
        ],
        "Clinical Sciences": [
            "Kayachikitsa",
            "Shalya Tantra",
            "Shalakya Tantra",
            "Prasuti Tantra & Stri Roga",
            "Kaumarabhritya",
        ],
        "Pharmacy & Materia Medica": [
            "Dravyaguna",
            "Rasashastra",
            "Bhaishajya Kalpana",
        ],
        "Therapeutic Practices": [
            "Panchakarma",
            "Swedana",
            "Snehana",
        ],
    },

    "Yoga & Naturopathy": {
        "Yoga": [
            "Yoga Therapy",
            "Therapeutic Yoga",
            "Yoga Anatomy",
            "Yoga Philosophy",
        ],
        "Naturopathy": [
            "Naturopathy Principles",
            "Naturopathy Therapies",
            "Diet & Lifestyle Management",
        ],
    },

    "Unani": {
        "Clinical Sciences": [
            "Moalajat",
            "Tahaffuzi wa Samaji Tib",
            "Ilmul Qabalat wa Nauma",
            "Jarahat",
        ],
        "Pharmacy & Materia Medica": [
            "Ilmul Advia",
            "Ilmul Saidla",
        ],
    },

    "Siddha": {
        "Clinical Sciences": [
            "Maruthuvam",
            "Varmam",
            "Siddha Diagnosis",
        ],
        "Pharmacy & Materia Medica": [
            "Gunapadam",
            "Siddha Pharmacology",
        ],
    },

    "Homoeopathy": {
        "Core Subjects": [
            "Materia Medica",
            "Organon of Medicine",
            "Repertory",
            "Homoeopathic Pharmacy",
        ],
        "Clinical Sciences": [
            "Homoeopathic Clinical Practice",
            "Case Taking",
        ],
    },

    "Sowa-Rigpa": {
        "Core Subjects": [
            "Traditional Medicine",
            "Sowa-Rigpa Diagnosis",
            "Pharmacology",
        ],
    },
}


def seed_database():
    db = SessionLocal()

    try:
        # --------------------------------------------------
        # AYUSH SYSTEMS
        # --------------------------------------------------

        systems = {}

        for data in AYUSH_SYSTEMS:
            system = db.scalar(
                select(AyushSystem).where(
                    AyushSystem.code == data["code"]
                )
            )

            if not system:
                system = AyushSystem(**data)
                db.add(system)
                db.flush()

            systems[data["name"]] = system

        # --------------------------------------------------
        # SKILL LEVELS
        # --------------------------------------------------

        for data in SKILL_LEVELS:
            existing = db.scalar(
                select(SkillLevel).where(
                    SkillLevel.name == data["name"]
                )
            )

            if not existing:
                db.add(SkillLevel(**data))

        db.flush()

        # --------------------------------------------------
        # SKILL CATEGORIES + SKILLS
        # --------------------------------------------------

        for system_name, categories in SKILL_DATA.items():

            system = systems[system_name]

            for category_name, skills in categories.items():

                category = db.scalar(
                    select(SkillCategory).where(
                        SkillCategory.ayush_system_id == system.id,
                        SkillCategory.name == category_name,
                    )
                )

                if not category:
                    category = SkillCategory(
                        name=category_name,
                        description=(
                            f"{category_name} skills related to "
                            f"{system_name}."
                        ),
                        ayush_system_id=system.id,
                    )

                    db.add(category)
                    db.flush()

                for skill_name in skills:

                    existing_skill = db.scalar(
                        select(Skill).where(
                            Skill.category_id == category.id,
                            Skill.name == skill_name,
                        )
                    )

                    if not existing_skill:
                        db.add(
                            Skill(
                                name=skill_name,
                                description=(
                                    f"{skill_name} competency "
                                    f"within {system_name}."
                                ),
                                category_id=category.id,
                            )
                        )

        db.commit()

        print("==========================================")
        print("AYUSH MASTER DATA SEEDED SUCCESSFULLY")
        print("==========================================")
        print("AYUSH systems : 6")
        print("Skill levels  : 5")
        print("Skill data    : Added/verified")
        print("==========================================")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()