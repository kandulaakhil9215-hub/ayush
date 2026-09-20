from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.collaboration import (
    Collaboration,
    GuestLecture,
    InnovationChallenge,
    Consultancy,
    Partnership,
)
from app.models.identity import Industry, Institution


def seed_collaboration():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # Find existing industry and institution records
        # ---------------------------------------------------------

        industries = (
            db.query(Industry)
            .order_by(Industry.id.asc())
            .all()
        )

        institutions = (
            db.query(Institution)
            .order_by(Institution.id.asc())
            .all()
        )

        if not industries:
            print("ERROR: No industry records found.")
            print("Run the industry seed data first.")
            return

        if not institutions:
            print("ERROR: No institution records found.")
            print("Run the institution seed data first.")
            return

        # Use existing database records.
        # This avoids hardcoding foreign-key IDs.
        industry_1 = industries[0]
        industry_2 = industries[1] if len(industries) > 1 else industries[0]
        industry_3 = industries[2] if len(industries) > 2 else industries[0]

        institution_1 = institutions[0]
        institution_2 = (
            institutions[1]
            if len(institutions) > 1
            else institutions[0]
        )

        today = datetime.utcnow()

        print()
        print("=" * 65)
        print("AYUSH INDUSTRY-ACADEMIA COLLABORATION SEED")
        print("=" * 65)
        print(f"Industry 1 ID : {industry_1.id}")
        print(f"Industry 2 ID : {industry_2.id}")
        print(f"Industry 3 ID : {industry_3.id}")
        print(
            f"Institution 1 : "
            f"{institution_1.id} - {institution_1.name}"
        )
        print(
            f"Institution 2 : "
            f"{institution_2.id} - {institution_2.name}"
        )

        # =========================================================
        # 1. COLLABORATION PROPOSALS
        # =========================================================

        collaborations = [
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": "AYUSH Clinical Skill Development Partnership",
                "collaboration_type": "SKILL_DEVELOPMENT",
                "description": (
                    "Industry-academia collaboration focused on "
                    "strengthening practical AYUSH clinical skills, "
                    "industry readiness, internships and competency "
                    "development for students."
                ),
                "start_date": today - timedelta(days=30),
                "end_date": today + timedelta(days=335),
                "status": "ACTIVE",
                "verified": True,
            },
            {
                "industry_id": industry_2.id,
                "institution_id": institution_1.id,
                "title": "AYUSH Clinical Research Collaboration",
                "collaboration_type": "RESEARCH",
                "description": (
                    "Collaborative initiative connecting AYUSH "
                    "academicians and industry researchers for "
                    "clinical research, research methodology and "
                    "evidence-based AYUSH studies."
                ),
                "start_date": today - timedelta(days=15),
                "end_date": today + timedelta(days=350),
                "status": "ACTIVE",
                "verified": True,
            },
            {
                "industry_id": industry_3.id,
                "institution_id": institution_2.id,
                "title": "Digital AYUSH Innovation Collaboration",
                "collaboration_type": "INNOVATION",
                "description": (
                    "Industry-academia collaboration focused on "
                    "digital health, AYUSH hospital technology, "
                    "clinical documentation and student innovation."
                ),
                "start_date": today,
                "end_date": today + timedelta(days=365),
                "status": "PROPOSED",
                "verified": False,
            },
        ]

        collaboration_count = 0

        for data in collaborations:
            existing = (
                db.query(Collaboration)
                .filter(
                    Collaboration.industry_id
                    == data["industry_id"],
                    Collaboration.institution_id
                    == data["institution_id"],
                    Collaboration.title
                    == data["title"],
                )
                .first()
            )

            if existing:
                continue

            db.add(Collaboration(**data))
            collaboration_count += 1

        # =========================================================
        # 2. GUEST LECTURES
        # =========================================================

        guest_lectures = [
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": "Industry Perspectives on Panchakarma Practice",
                "topic": (
                    "Panchakarma: Clinical Practice, Patient Safety "
                    "and Industry Expectations"
                ),
                "description": (
                    "An industry-led guest lecture introducing "
                    "students to practical Panchakarma workflows, "
                    "patient safety, documentation and professional "
                    "expectations in AYUSH healthcare."
                ),
                "scheduled_at": today + timedelta(days=14),
                "mode": "ONLINE",
                "status": "PLANNED",
            },
            {
                "industry_id": industry_2.id,
                "institution_id": institution_1.id,
                "title": "Building Careers in AYUSH Clinical Research",
                "topic": (
                    "Clinical Research, Evidence Generation and "
                    "Research Methodology in AYUSH"
                ),
                "description": (
                    "Industry researchers will explain clinical "
                    "research workflows, study design, documentation, "
                    "data interpretation and career opportunities "
                    "for AYUSH students."
                ),
                "scheduled_at": today + timedelta(days=28),
                "mode": "ONLINE",
                "status": "PLANNED",
            },
            {
                "industry_id": industry_3.id,
                "institution_id": institution_2.id,
                "title": "Digital Transformation in AYUSH Healthcare",
                "topic": (
                    "Digital Health, Electronic Clinical Documentation "
                    "and Technology in AYUSH Hospitals"
                ),
                "description": (
                    "A practical session on how digital health "
                    "technologies are being used in AYUSH healthcare "
                    "delivery and hospital management."
                ),
                "scheduled_at": today + timedelta(days=45),
                "mode": "HYBRID",
                "status": "PLANNED",
            },
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": "From AYUSH Education to Industry Readiness",
                "topic": (
                    "Skills, Internships and Career Opportunities "
                    "for AYUSH Graduates"
                ),
                "description": (
                    "Industry experts discuss the competencies "
                    "expected from AYUSH graduates and how students "
                    "can prepare for internships and employment."
                ),
                "scheduled_at": today + timedelta(days=60),
                "mode": "OFFLINE",
                "status": "PLANNED",
            },
        ]

        guest_lecture_count = 0

        for data in guest_lectures:
            existing = (
                db.query(GuestLecture)
                .filter(
                    GuestLecture.industry_id
                    == data["industry_id"],
                    GuestLecture.institution_id
                    == data["institution_id"],
                    GuestLecture.title
                    == data["title"],
                )
                .first()
            )

            if existing:
                continue

            db.add(GuestLecture(**data))
            guest_lecture_count += 1

        # =========================================================
        # 3. INNOVATION CHALLENGES
        # =========================================================

        innovation_challenges = [
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": (
                    "Smart Panchakarma Patient Monitoring Challenge"
                ),
                "problem_statement": (
                    "Develop a practical digital solution for "
                    "monitoring Panchakarma procedures, patient "
                    "progress and treatment documentation while "
                    "maintaining AYUSH clinical workflows."
                ),
                "description": (
                    "Students and faculty teams can propose "
                    "technology-enabled approaches for improving "
                    "Panchakarma monitoring and clinical documentation."
                ),
                "deadline": today + timedelta(days=90),
                "status": "OPEN",
            },
            {
                "industry_id": industry_2.id,
                "institution_id": institution_1.id,
                "title": (
                    "AYUSH Clinical Research Data Intelligence Challenge"
                ),
                "problem_statement": (
                    "Design a solution that helps AYUSH researchers "
                    "organize clinical observations, research data "
                    "and evidence while improving consistency and "
                    "research documentation."
                ),
                "description": (
                    "A research-oriented innovation challenge "
                    "focused on clinical research methodology, "
                    "data analysis and evidence generation."
                ),
                "deadline": today + timedelta(days=120),
                "status": "OPEN",
            },
            {
                "industry_id": industry_3.id,
                "institution_id": institution_2.id,
                "title": (
                    "Digital AYUSH Hospital Workflow Challenge"
                ),
                "problem_statement": (
                    "Create a technology solution that improves "
                    "patient registration, clinical documentation, "
                    "hospital workflow and service tracking in "
                    "AYUSH healthcare institutions."
                ),
                "description": (
                    "Teams will explore practical digital health "
                    "solutions suitable for AYUSH hospitals and "
                    "wellness centres."
                ),
                "deadline": today + timedelta(days=150),
                "status": "OPEN",
            },
        ]

        innovation_count = 0

        for data in innovation_challenges:
            existing = (
                db.query(InnovationChallenge)
                .filter(
                    InnovationChallenge.industry_id
                    == data["industry_id"],
                    InnovationChallenge.institution_id
                    == data["institution_id"],
                    InnovationChallenge.title
                    == data["title"],
                )
                .first()
            )

            if existing:
                continue

            db.add(InnovationChallenge(**data))
            innovation_count += 1

        # =========================================================
        # 4. CONSULTANCIES
        # =========================================================

        consultancies = [
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": (
                    "Ayurveda Clinical Documentation Consultancy"
                ),
                "description": (
                    "Faculty experts provide consultancy on improving "
                    "Ayurveda clinical documentation, patient records, "
                    "case presentation and standard clinical workflows."
                ),
                "start_date": today - timedelta(days=10),
                "end_date": today + timedelta(days=170),
                "status": "ACTIVE",
            },
            {
                "industry_id": industry_2.id,
                "institution_id": institution_1.id,
                "title": (
                    "AYUSH Research Methodology Consultancy"
                ),
                "description": (
                    "Academic experts collaborate with industry "
                    "research teams on research methodology, study "
                    "design, clinical documentation, data analysis "
                    "and evidence-generation practices."
                ),
                "start_date": today + timedelta(days=7),
                "end_date": today + timedelta(days=187),
                "status": "PROPOSED",
            },
            {
                "industry_id": industry_3.id,
                "institution_id": institution_2.id,
                "title": (
                    "AYUSH Hospital Process Improvement Consultancy"
                ),
                "description": (
                    "Faculty and industry professionals collaborate "
                    "to improve AYUSH hospital processes, patient "
                    "communication, service workflows and digital "
                    "health adoption."
                ),
                "start_date": today - timedelta(days=5),
                "end_date": today + timedelta(days=210),
                "status": "ACTIVE",
            },
        ]

        consultancy_count = 0

        for data in consultancies:
            existing = (
                db.query(Consultancy)
                .filter(
                    Consultancy.industry_id
                    == data["industry_id"],
                    Consultancy.institution_id
                    == data["institution_id"],
                    Consultancy.title
                    == data["title"],
                )
                .first()
            )

            if existing:
                continue

            db.add(Consultancy(**data))
            consultancy_count += 1

        # =========================================================
        # 5. PARTNERSHIPS
        # =========================================================

        partnerships = [
            {
                "industry_id": industry_1.id,
                "institution_id": institution_1.id,
                "title": (
                    "AYUSH Industry Internship and Skill Development "
                    "Partnership"
                ),
                "description": (
                    "Long-term industry-academia partnership for "
                    "student internships, skill development, "
                    "mentorship, guest lectures and placement "
                    "readiness."
                ),
                "agreement_type": "INTERNSHIP_AND_SKILL_DEVELOPMENT",
                "start_date": today - timedelta(days=60),
                "end_date": today + timedelta(days=305),
                "status": "ACTIVE",
                "verified": True,
            },
            {
                "industry_id": industry_2.id,
                "institution_id": institution_1.id,
                "title": (
                    "AYUSH Clinical Research and Innovation Partnership"
                ),
                "description": (
                    "Strategic partnership supporting collaborative "
                    "AYUSH research, student projects, research "
                    "training, publications and innovation activities."
                ),
                "agreement_type": "RESEARCH_AND_INNOVATION",
                "start_date": today - timedelta(days=35),
                "end_date": today + timedelta(days=330),
                "status": "ACTIVE",
                "verified": True,
            },
            {
                "industry_id": industry_3.id,
                "institution_id": institution_2.id,
                "title": (
                    "Digital Health and AYUSH Hospital Partnership"
                ),
                "description": (
                    "Partnership focused on digital transformation, "
                    "hospital workflow improvement, student projects "
                    "and practical exposure to technology-enabled "
                    "AYUSH healthcare."
                ),
                "agreement_type": "DIGITAL_HEALTH",
                "start_date": today - timedelta(days=20),
                "end_date": today + timedelta(days=345),
                "status": "ACTIVE",
                "verified": True,
            },
        ]

        partnership_count = 0

        for data in partnerships:
            existing = (
                db.query(Partnership)
                .filter(
                    Partnership.industry_id
                    == data["industry_id"],
                    Partnership.institution_id
                    == data["institution_id"],
                    Partnership.title
                    == data["title"],
                )
                .first()
            )

            if existing:
                continue

            db.add(Partnership(**data))
            partnership_count += 1

        # ---------------------------------------------------------
        # Commit everything together
        # ---------------------------------------------------------

        db.commit()

        print()
        print("-" * 65)
        print("SEEDING COMPLETED")
        print("-" * 65)
        print(f"Collaboration proposals added : {collaboration_count}")
        print(f"Guest lectures added          : {guest_lecture_count}")
        print(f"Innovation challenges added   : {innovation_count}")
        print(f"Consultancies added           : {consultancy_count}")
        print(f"Partnerships added             : {partnership_count}")
        print("-" * 65)

        # Show total records now in database
        print()
        print("DATABASE TOTALS")
        print(f"Collaboration proposals : {db.query(Collaboration).count()}")
        print(f"Guest lectures          : {db.query(GuestLecture).count()}")
        print(
            "Innovation challenges   : "
            f"{db.query(InnovationChallenge).count()}"
        )
        print(f"Consultancies           : {db.query(Consultancy).count()}")
        print(f"Partnerships            : {db.query(Partnership).count()}")
        print("=" * 65)

    except Exception as exc:
        db.rollback()
        print()
        print("ERROR while seeding collaboration data:")
        print(exc)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_collaboration()