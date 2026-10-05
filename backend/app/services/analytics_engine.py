from __future__ import annotations

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.identity import (
    Institution,
    Student,
    Faculty,
    Industry,
)
from app.models.skills import Skill, StudentSkill
from app.models.skill_gap import SkillGap
from app.models.opportunities import Internship, Job
from app.models.applications import Application

from app.services.skill_demand_engine import (
    calculate_skill_demand,
    get_emerging_skills,
    get_training_requirements,
)


def get_national_analytics(db: Session):
    skill_demand = calculate_skill_demand(db)

    total_institutions = (
        db.query(Institution)
        .filter(Institution.is_active == True)
        .count()
    )
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_industries = db.query(Industry).count()
    total_skills = db.query(Skill).count()

    total_assessed_skills = (
        db.query(StudentSkill)
        .filter(StudentSkill.score.isnot(None))
        .count()
    )

    total_internships = (
        db.query(Internship)
        .filter(Internship.status == "OPEN")
        .count()
    )

    total_jobs = (
        db.query(Job)
        .filter(Job.status == "OPEN")
        .count()
    )

    total_applications = db.query(Application).count()

    raw_results = skill_demand.get("results", [])
    demand_results = []
    for item in raw_results:
        normalized = dict(item)
        s_name = normalized.get("skill_name") or normalized.get("name") or "Unknown"
        normalized["skill_name"] = s_name
        normalized["name"] = s_name
        demand_results.append(normalized)

    top_skills = sorted(
        demand_results,
        key=lambda x: x.get("demand_score", 0),
        reverse=True,
    )[:10]

    # Aggregate student skill gaps from SkillGap table
    gap_query = (
        db.query(
            Skill.id.label("skill_id"),
            Skill.name.label("skill_name"),
            func.count(SkillGap.id).label("gap_count"),
            func.avg(SkillGap.gap_score).label("avg_gap"),
            func.max(SkillGap.gap_score).label("max_gap"),
        )
        .join(Skill, Skill.id == SkillGap.skill_id)
        .filter(SkillGap.gap_score > 0)
        .group_by(Skill.id, Skill.name)
        .order_by(desc("avg_gap"))
        .all()
    )

    critical_gaps = []
    gap_results = []
    for row in gap_query:
        item = {
            "skill_id": row.skill_id,
            "skill_name": row.skill_name,
            "name": row.skill_name,
            "skill_gap": round(float(row.avg_gap or 0), 1),
            "gap_count": int(row.gap_count or 0),
            "skill_gap_count": int(row.gap_count or 0),
            "demand_score": round(float(row.max_gap or 0), 1),
            "classification": "CRITICAL" if (row.avg_gap or 0) >= 50 else "MODERATE",
        }
        gap_results.append(item)
        if item["classification"] == "CRITICAL" or item["skill_gap"] > 0:
            critical_gaps.append(item)

    if not critical_gaps and demand_results:
        for item in sorted(demand_results, key=lambda x: x.get("skill_gap", 0) or x.get("gap_count", 0), reverse=True):
            if (item.get("skill_gap", 0) or 0) > 0 or (item.get("gap_count", 0) or 0) > 0:
                critical_gaps.append(item)
                gap_results.append(item)

    skill_gap_intelligence = {
        "total_skill_gap": sum(g.get("skill_gap", 0) for g in gap_results),
        "skills_with_gap": len(gap_results),
        "critical_gaps": critical_gaps,
        "results": gap_results,
    }

    industry_skill_demand = {
        "total_skills": len(demand_results),
        "results": demand_results,
        "top_skills": top_skills,
    }

    return {
        "scope": "NATIONAL",
        "overview": {
            "total_institutions": total_institutions,
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_industries": total_industries,
            "total_skills": total_skills,
            "total_assessed_skills": total_assessed_skills,
            "open_internships": total_internships,
            "open_jobs": total_jobs,
            "total_applications": total_applications,
        },
        "industry_skill_demand": industry_skill_demand,
        "skill_gap_intelligence": skill_gap_intelligence,
        "top_demanded_skills": top_skills,
        "emerging_skills": get_emerging_skills(db, limit=10),
        "training_requirements": get_training_requirements(db, limit=10),
    }


def get_state_analytics(db: Session, state: str):
    institutions = (
        db.query(Institution)
        .filter(
            Institution.state == state,
            Institution.is_active == True,
        )
        .all()
    )
    institution_ids = [inst.id for inst in institutions]
    students = (
        db.query(Student)
        .filter(Student.institution_id.in_(institution_ids))
        .count()
        if institution_ids
        else 0
    )
    faculty = (
        db.query(Faculty)
        .filter(Faculty.institution_id.in_(institution_ids))
        .count()
        if institution_ids
        else 0
    )
    return {
        "state": state,
        "institutions": len(institutions),
        "students": students,
        "faculty": faculty,
    }


def get_institution_analytics(db: Session, institution_id: int):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        return None
    students = db.query(Student).filter(Student.institution_id == institution_id).count()
    faculty = db.query(Faculty).filter(Faculty.institution_id == institution_id).count()
    return {
        "institution_id": institution_id,
        "name": inst.name,
        "students": students,
        "faculty": faculty,
    }