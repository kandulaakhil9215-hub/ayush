from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.identity import User, Industry
from app.models.opportunities import Internship, Job, OpportunitySkill
from app.models.skills import Skill
from app.core.security import hash_password


def get_or_create_industry(db, email, company_name, industry_type, website):
    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            email=email,
            password_hash=hash_password("Industry@123"),
            full_name=company_name,
            is_active=True,
        )
        db.add(user)
        db.flush()

    industry = db.query(Industry).filter(
        Industry.user_id == user.id
    ).first()

    if not industry:
        industry = Industry(
            user_id=user.id,
            company_name=company_name,
            industry_type=industry_type,
            website=website,
            headquarters="India",
            is_verified=True,
        )
        db.add(industry)
        db.flush()

    return industry


def get_skill(db, name):
    skill = db.query(Skill).filter(Skill.name == name).first()

    if not skill:
        raise ValueError(f"Skill not found: {name}")

    return skill


def add_internship(db, industry, title, description, skills):
    internship = Internship(
        industry_id=industry.id,
        title=title,
        description=description,
        eligibility="AYUSH students with relevant academic background",
        location="India",
        duration="3 Months",
        stipend=10000,
        application_deadline=datetime.utcnow() + timedelta(days=60),
        source_url=None,
        official_url=None,
        verified=True,
        status="OPEN",
    )

    db.add(internship)
    db.flush()

    for skill_name, required_score, weight in skills:
        db.add(
            OpportunitySkill(
                internship_id=internship.id,
                skill_id=get_skill(db, skill_name).id,
                required_score=required_score,
                importance_weight=weight,
            )
        )

    return internship


def add_job(db, industry, title, description, skills):
    job = Job(
        industry_id=industry.id,
        title=title,
        description=description,
        eligibility="Relevant AYUSH qualification with required skills",
        location="India",
        employment_type="Full-time",
        salary_min=300000,
        salary_max=600000,
        application_deadline=datetime.utcnow() + timedelta(days=90),
        source_url=None,
        official_url=None,
        verified=True,
        status="OPEN",
    )

    db.add(job)
    db.flush()

    for skill_name, required_score, weight in skills:
        db.add(
            OpportunitySkill(
                job_id=job.id,
                skill_id=get_skill(db, skill_name).id,
                required_score=required_score,
                importance_weight=weight,
            )
        )

    return job


def seed():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # INDUSTRIES
        # ---------------------------------------------------------

        ayurveda_org = get_or_create_industry(
            db,
            "industry.ayurveda@ayush.com",
            "Ayurveda Healthcare Research Centre",
            "AYURVEDA",
            None,
        )

        research_org = get_or_create_industry(
            db,
            "industry.research@ayush.com",
            "AYUSH Clinical Research Institute",
            "AYUSH_RESEARCH",
            None,
        )

        hospital_org = get_or_create_industry(
            db,
            "industry.hospital@ayush.com",
            "Integrated AYUSH Wellness Hospital",
            "AYUSH_HOSPITAL",
            None,
        )

        # ---------------------------------------------------------
        # INTERNSHIPS
        # ---------------------------------------------------------

        add_internship(
            db,
            ayurveda_org,
            "Panchakarma Clinical Internship",
            "Hands-on exposure to Panchakarma procedures and Ayurvedic clinical practice.",
            [
                ("Panchakarma", 75, 1.5),
                ("Kayachikitsa", 65, 1.2),
                ("Dravyaguna", 60, 1.0),
            ],
        )

        add_internship(
            db,
            research_org,
            "AYUSH Clinical Research Internship",
            "Research internship focused on AYUSH clinical research and research methodology.",
            [
                ("Clinical Research", 70, 1.5),
                ("Research Methodology", 70, 1.5),
                ("Kayachikitsa", 60, 1.0),
            ],
        )

        add_internship(
            db,
            hospital_org,
            "AYUSH Hospital Management Internship",
            "Internship covering hospital operations, communication and AYUSH healthcare management.",
            [
                ("AYUSH Hospital Management", 70, 1.5),
                ("Communication", 65, 1.0),
                ("Leadership", 65, 1.2),
            ],
        )

        # ---------------------------------------------------------
        # JOBS
        # ---------------------------------------------------------

        add_job(
            db,
            ayurveda_org,
            "Junior Ayurvedic Clinical Practitioner",
            "Entry-level clinical role supporting Ayurvedic patient care.",
            [
                ("Kayachikitsa", 75, 1.5),
                ("Dravyaguna", 70, 1.2),
                ("Panchakarma", 60, 1.0),
            ],
        )

        add_job(
            db,
            research_org,
            "Clinical Research Associate - AYUSH",
            "Research role supporting AYUSH clinical studies and documentation.",
            [
                ("Clinical Research", 70, 1.5),
                ("Research Methodology", 70, 1.5),
                ("Kayachikitsa", 60, 1.0),
            ],
        )

        add_job(
            db,
            hospital_org,
            "AYUSH Healthcare Management Trainee",
            "Management trainee role supporting AYUSH healthcare operations.",
            [
                ("AYUSH Hospital Management", 70, 1.5),
                ("Communication", 65, 1.0),
                ("Leadership", 65, 1.2),
            ],
        )

        db.commit()

        print("=" * 50)
        print("AYUSH OPPORTUNITY DATA SEEDED SUCCESSFULLY")
        print("=" * 50)

        print(
            "Industries:",
            db.query(Industry).count(),
        )
        print(
            "Internships:",
            db.query(Internship).count(),
        )
        print(
            "Jobs:",
            db.query(Job).count(),
        )
        print(
            "Opportunity Skills:",
            db.query(OpportunitySkill).count(),
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()