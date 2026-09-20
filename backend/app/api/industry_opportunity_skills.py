from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.permissions import require_roles
from app.models.identity import Industry
from app.models.opportunities import Internship, Job, OpportunitySkill
from app.models.skills import Skill


router = APIRouter(
    prefix="/api/industry/opportunities",
    tags=["Industry Opportunity Skills"],
)


class RequiredSkillCreate(BaseModel):
    skill_id: int
    required_score: float = 60.0
    importance_weight: float = 1.0


def get_industry(db: Session, user_id: int):
    industry = (
        db.query(Industry)
        .filter(Industry.user_id == user_id)
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=404,
            detail="Industry profile not found",
        )

    return industry


@router.post("/internships/{internship_id}/skills")
def add_internship_skill(
    internship_id: int,
    payload: RequiredSkillCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_industry(db, current_user.id)

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id,
            Internship.industry_id == industry.id,
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found or does not belong to your industry",
        )

    return add_skill_mapping(
        db=db,
        internship_id=internship.id,
        job_id=None,
        payload=payload,
    )


@router.post("/jobs/{job_id}/skills")
def add_job_skill(
    job_id: int,
    payload: RequiredSkillCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_industry(db, current_user.id)

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.industry_id == industry.id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or does not belong to your industry",
        )

    return add_skill_mapping(
        db=db,
        internship_id=None,
        job_id=job.id,
        payload=payload,
    )


def add_skill_mapping(
    db: Session,
    internship_id: int | None,
    job_id: int | None,
    payload: RequiredSkillCreate,
):
    skill = db.get(Skill, payload.skill_id)

    if not skill:
        raise HTTPException(
            status_code=404,
            detail="Skill not found",
        )

    if payload.required_score < 0 or payload.required_score > 100:
        raise HTTPException(
            status_code=400,
            detail="required_score must be between 0 and 100",
        )

    if payload.importance_weight <= 0:
        raise HTTPException(
            status_code=400,
            detail="importance_weight must be greater than 0",
        )

    query = db.query(OpportunitySkill).filter(
        OpportunitySkill.skill_id == skill.id
    )

    if internship_id is not None:
        existing = query.filter(
            OpportunitySkill.internship_id == internship_id
        ).first()
    else:
        existing = query.filter(
            OpportunitySkill.job_id == job_id
        ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This skill is already required for this opportunity",
        )

    mapping = OpportunitySkill(
        internship_id=internship_id,
        job_id=job_id,
        skill_id=skill.id,
        required_score=payload.required_score,
        importance_weight=payload.importance_weight,
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    return {
        "message": "Required skill added successfully",
        "mapping_id": mapping.id,
        "skill": {
            "id": skill.id,
            "name": skill.name,
            "required_score": mapping.required_score,
            "importance_weight": mapping.importance_weight,
        },
    }


@router.get("/internships/{internship_id}/skills")
def get_internship_skills(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_industry(db, current_user.id)

    internship = (
        db.query(Internship)
        .filter(
            Internship.id == internship_id,
            Internship.industry_id == industry.id,
        )
        .first()
    )

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found or does not belong to your industry",
        )

    return get_skill_list(
        db,
        internship_id=internship.id,
        job_id=None,
        opportunity_title=internship.title,
    )


@router.get("/jobs/{job_id}/skills")
def get_job_skills(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("INDUSTRY")),
):
    industry = get_industry(db, current_user.id)

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.industry_id == industry.id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or does not belong to your industry",
        )

    return get_skill_list(
        db,
        internship_id=None,
        job_id=job.id,
        opportunity_title=job.title,
    )


def get_skill_list(
    db: Session,
    internship_id: int | None,
    job_id: int | None,
    opportunity_title: str,
):
    query = db.query(OpportunitySkill)

    if internship_id is not None:
        mappings = query.filter(
            OpportunitySkill.internship_id == internship_id
        ).all()
    else:
        mappings = query.filter(
            OpportunitySkill.job_id == job_id
        ).all()

    skills = []

    for mapping in mappings:
        skill = db.get(Skill, mapping.skill_id)

        if skill:
            skills.append(
                {
                    "mapping_id": mapping.id,
                    "skill_id": skill.id,
                    "skill_name": skill.name,
                    "required_score": mapping.required_score,
                    "importance_weight": mapping.importance_weight,
                }
            )

    return {
        "opportunity_title": opportunity_title,
        "total_required_skills": len(skills),
        "skills": skills,
    }