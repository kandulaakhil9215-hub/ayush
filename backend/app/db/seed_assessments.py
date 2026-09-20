from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.assessment import (
    Assessment,
    AssessmentVersion,
    Question,
    QuestionSkill,
)
from app.models.skills import AyushSystem, Skill


def get_skill(
    db: Session,
    name: str,
    ayush_system_name: str | None = None,
):
    query = db.query(Skill).filter(Skill.name == name)

    return query.first()


def seed_assessments():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # 1. Find AYUSH system
        # ---------------------------------------------------------

        ayurveda = (
            db.query(AyushSystem)
            .filter(AyushSystem.name == "Ayurveda")
            .first()
        )

        if not ayurveda:
            print("ERROR: Ayurveda AYUSH system not found.")
            print("Run seed_ayush.py first.")
            return

        # ---------------------------------------------------------
        # 2. Create Assessment
        # ---------------------------------------------------------

        assessment = (
            db.query(Assessment)
            .filter(
                Assessment.name
                == "BAMS Clinical Skills Assessment - Kayachikitsa"
            )
            .first()
        )

        if not assessment:
            assessment = Assessment(
                name="BAMS Clinical Skills Assessment - Kayachikitsa",
                description=(
                    "AYUSH-focused assessment evaluating foundational "
                    "clinical knowledge relevant to Kayachikitsa practice."
                ),
                assessment_type="SKILL",
                ayush_system_id=ayurveda.id,
                is_active=True,
            )

            db.add(assessment)
            db.flush()

        # ---------------------------------------------------------
        # 3. Create Assessment Version
        # ---------------------------------------------------------

        version = (
            db.query(AssessmentVersion)
            .filter(
                AssessmentVersion.assessment_id == assessment.id,
                AssessmentVersion.version_number == 1,
            )
            .first()
        )

        if not version:
            version = AssessmentVersion(
                assessment_id=assessment.id,
                version_number=1,
                instructions=(
                    "Answer all questions. Each question has one "
                    "correct answer. The assessment evaluates "
                    "AYUSH clinical knowledge and related skills."
                ),
                passing_score=40,
                duration_minutes=20,
                is_active=True,
            )

            db.add(version)
            db.flush()

        # ---------------------------------------------------------
        # 4. Find required skills
        # ---------------------------------------------------------

        kayachikitsa = get_skill(
            db,
            "Kayachikitsa",
            "Ayurveda",
        )

        panchakarma = get_skill(
            db,
            "Panchakarma",
            "Ayurveda",
        )

        dravyaguna = get_skill(
            db,
            "Dravyaguna",
            "Ayurveda",
        )

        # ---------------------------------------------------------
        # 5. AYUSH Questions
        # ---------------------------------------------------------

        questions = [
            {
                "text": (
                    "Which branch of Ayurveda primarily deals with "
                    "the diagnosis and management of systemic diseases?"
                ),
                "options": [
                    "Kayachikitsa",
                    "Shalya Tantra",
                    "Shalakya Tantra",
                    "Kaumarabhritya",
                ],
                "answer": "Kayachikitsa",
                "difficulty": "EASY",
                "skill": kayachikitsa,
                "explanation": (
                    "Kayachikitsa is the branch of Ayurveda concerned "
                    "with internal medicine and systemic disorders."
                ),
            },
            {
                "text": (
                    "Which Ayurvedic therapeutic procedure involves "
                    "controlled administration of medicated oil or "
                    "ghee internally?"
                ),
                "options": [
                    "Snehapana",
                    "Swedana",
                    "Vamana",
                    "Raktamokshana",
                ],
                "answer": "Snehapana",
                "difficulty": "MEDIUM",
                "skill": panchakarma,
                "explanation": (
                    "Snehapana refers to the controlled internal "
                    "administration of medicated sneha such as oil or ghee."
                ),
            },
            {
                "text": (
                    "Which Ayurvedic discipline focuses on the study "
                    "of medicinal plants and their properties?"
                ),
                "options": [
                    "Dravyaguna",
                    "Kayachikitsa",
                    "Shalya Tantra",
                    "Rasashastra",
                ],
                "answer": "Dravyaguna",
                "difficulty": "EASY",
                "skill": dravyaguna,
                "explanation": (
                    "Dravyaguna deals with medicinal substances, "
                    "their properties, actions and therapeutic uses."
                ),
            },
            {
                "text": (
                    "Which of the following is traditionally associated "
                    "with Panchakarma therapy?"
                ),
                "options": [
                    "Vamana",
                    "Electrocardiography",
                    "Radiography",
                    "Hemodialysis",
                ],
                "answer": "Vamana",
                "difficulty": "EASY",
                "skill": panchakarma,
                "explanation": (
                    "Vamana is one of the traditionally described "
                    "Panchakarma procedures."
                ),
            },
            {
                "text": (
                    "In Ayurvedic clinical practice, assessment of "
                    "the patient's condition should be performed before "
                    "selecting a therapeutic approach."
                ),
                "options": [
                    "True",
                    "False",
                ],
                "answer": "True",
                "difficulty": "EASY",
                "skill": kayachikitsa,
                "explanation": (
                    "Clinical assessment is essential before selecting "
                    "an appropriate therapeutic approach."
                ),
            },
            {
                "text": (
                    "Which concept is particularly important when "
                    "evaluating an individual's constitution in Ayurveda?"
                ),
                "options": [
                    "Prakriti",
                    "GDP",
                    "BMI only",
                    "Blood group only",
                ],
                "answer": "Prakriti",
                "difficulty": "MEDIUM",
                "skill": kayachikitsa,
                "explanation": (
                    "Prakriti refers to the individual's constitutional "
                    "type and is an important consideration in Ayurveda."
                ),
            },
            {
                "text": (
                    "Which Ayurvedic procedure is primarily associated "
                    "with therapeutic sweating?"
                ),
                "options": [
                    "Swedana",
                    "Snehapana",
                    "Virechana",
                    "Nasya",
                ],
                "answer": "Swedana",
                "difficulty": "EASY",
                "skill": panchakarma,
                "explanation": (
                    "Swedana is a therapeutic procedure involving "
                    "induced sweating."
                ),
            },
            {
                "text": (
                    "Dravyaguna knowledge is useful for selecting "
                    "medicinal substances according to their properties "
                    "and therapeutic actions."
                ),
                "options": [
                    "True",
                    "False",
                ],
                "answer": "True",
                "difficulty": "EASY",
                "skill": dravyaguna,
                "explanation": (
                    "Dravyaguna provides knowledge about medicinal "
                    "substances, their properties and actions."
                ),
            },
            {
                "text": (
                    "Which factor should NOT be considered in isolation "
                    "when making an Ayurvedic clinical decision?"
                ),
                "options": [
                    "A single symptom without clinical context",
                    "Patient assessment",
                    "Clinical history",
                    "Patient condition",
                ],
                "answer": "A single symptom without clinical context",
                "difficulty": "MEDIUM",
                "skill": kayachikitsa,
                "explanation": (
                    "Clinical decisions should consider the overall "
                    "patient context rather than relying on a single "
                    "isolated symptom."
                ),
            },
            {
                "text": (
                    "Panchakarma procedures should be selected and "
                    "administered according to the patient's condition "
                    "and appropriate clinical assessment."
                ),
                "options": [
                    "True",
                    "False",
                ],
                "answer": "True",
                "difficulty": "MEDIUM",
                "skill": panchakarma,
                "explanation": (
                    "Therapeutic procedures should be selected based "
                    "on appropriate assessment and clinical suitability."
                ),
            },
        ]

        # ---------------------------------------------------------
        # 6. Insert Questions
        # ---------------------------------------------------------

        created_questions = 0

        for item in questions:

            if not item["skill"]:
                print(
                    f"WARNING: Skill not found for question: "
                    f"{item['text'][:50]}"
                )
                continue

            existing_question = (
                db.query(Question)
                .filter(
                    Question.assessment_version_id == version.id,
                    Question.question_text == item["text"],
                )
                .first()
            )

            if existing_question:
                continue

            question = Question(
                assessment_version_id=version.id,
                question_text=item["text"],
                question_type="MCQ",
                options="|||".join(item["options"]),
                correct_answer=item["answer"],
                difficulty=item["difficulty"],
                marks=1,
                explanation=item["explanation"],
            )

            db.add(question)
            db.flush()

            question_skill = QuestionSkill(
                question_id=question.id,
                skill_id=item["skill"].id,
                weight=1,
            )

            db.add(question_skill)

            created_questions += 1

        db.commit()

        print()
        print("==============================================")
        print("AYUSH ASSESSMENT SEED COMPLETED")
        print("==============================================")
        print(f"Assessment : {assessment.name}")
        print(f"Version    : {version.version_number}")
        print(f"Questions  : {created_questions}")
        print("System     : Ayurveda")
        print("==============================================")

    except Exception as e:
        db.rollback()
        print("ERROR:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_assessments()