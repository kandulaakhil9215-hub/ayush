from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db

from app.models.identity import (
    User,
    Role,
    user_roles,
    Institution,
    Student,
    Faculty,
    Industry,
)
from app.models.skills import Skill, StudentSkill
from app.models.opportunities import Internship, Job
from app.models.applications import Application
from app.models.audit import AuditLog

from app.services.skill_demand_engine import (
    calculate_skill_demand,
    get_emerging_skills,
    get_training_requirements,
)

router = APIRouter(
    prefix="/api/admin/dashboard",
    tags=["Admin Dashboard"],
)

ADMIN_ROLES = (
    "SUPER_ADMIN",
    "NATIONAL_ADMIN",
    "STATE_ADMIN",
    "INSTITUTION_ADMIN",
)


@router.get("/overview")
def admin_dashboard_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*ADMIN_ROLES)),
):
    """
    National-level Admin Dashboard overview.

    All values are calculated from the PostgreSQL database.
    No dashboard metrics are hardcoded.
    """

    # ============================================================
    # BASIC PLATFORM COUNTS
    # ============================================================

    total_institutions = (
        db.query(Institution)
        .filter(Institution.is_active.is_(True))
        .count()
    )

    total_students = db.query(Student).count()

    total_faculty = db.query(Faculty).count()

    total_industries = db.query(Industry).count()

    total_skills = (
        db.query(Skill)
        .filter(Skill.is_active.is_(True))
        .count()
    )

    total_assessed_skills = (
        db.query(StudentSkill)
        .filter(StudentSkill.score.isnot(None))
        .count()
    )

    # ============================================================
    # PRACTITIONERS
    # ============================================================

    practitioner_count = (
        db.query(User.id)
        .join(
            user_roles,
            user_roles.c.user_id == User.id,
        )
        .join(
            Role,
            Role.id == user_roles.c.role_id,
        )
        .filter(Role.name == "PRACTITIONER")
        .count()
    )

    # ============================================================
    # OPPORTUNITIES
    # ============================================================

    open_internships = (
        db.query(Internship)
        .filter(Internship.status == "OPEN")
        .count()
    )

    open_jobs = (
        db.query(Job)
        .filter(Job.status == "OPEN")
        .count()
    )

    total_applications = db.query(Application).count()

    # ============================================================
    # APPLICATION / PLACEMENT INTELLIGENCE
    # ============================================================

    application_status_rows = (
        db.query(
            Application.status,
            func.count(Application.id),
        )
        .group_by(Application.status)
        .all()
    )

    application_status_counts = {
        str(status): count
        for status, count in application_status_rows
    }

    shortlisted_applications = application_status_counts.get(
        "SHORTLISTED",
        0,
    )

    rejected_applications = application_status_counts.get(
        "REJECTED",
        0,
    )

    applied_applications = application_status_counts.get(
        "APPLIED",
        0,
    )

    hired_applications = sum(
        count
        for status, count in application_status_counts.items()
        if status.upper()
        in {
            "HIRED",
            "SELECTED",
            "PLACED",
            "OFFERED",
        }
    )

    placement_rate = (
        round(
            (hired_applications / total_applications) * 100,
            2,
        )
        if total_applications
        else 0.0
    )

    placement_intelligence = {
        "total_applications": total_applications,
        "applied": applied_applications,
        "shortlisted": shortlisted_applications,
        "rejected": rejected_applications,
        "hired": hired_applications,
        "placement_rate": placement_rate,
        "status_breakdown": [
            {
                "status": status,
                "count": count,
            }
            for status, count in sorted(
                application_status_counts.items()
            )
        ],
    }

    # ============================================================
    # SKILL DEMAND INTELLIGENCE
    # ============================================================

    skill_demand = calculate_skill_demand(db)

    demand_results = skill_demand.get(
        "results",
        [],
    )

    top_demanded_skills = sorted(
        demand_results,
        key=lambda item: float(
            item.get("demand_score", 0) or 0
        ),
        reverse=True,
    )[:10]

    # ============================================================
    # SKILL GAP INTELLIGENCE
    # ============================================================

    skill_gap_data = []

    for item in demand_results:
        skill_gap = float(
            item.get("skill_gap_count", 0) or 0
        )

        demand_count = int(
            item.get("demand_count", 0) or 0
        )

        supply_count = int(
            item.get("student_supply_count", 0) or 0
        )

        gap_percentage = (
            round(
                (skill_gap / demand_count) * 100,
                2,
            )
            if demand_count > 0
            else 0.0
        )

        skill_gap_data.append(
            {
                "skill_id": item.get("skill_id"),
                "skill_name": item.get("skill_name"),
                "demand_count": demand_count,
                "student_supply_count": supply_count,
                "skill_gap_count": skill_gap,
                "gap_percentage": gap_percentage,
                "demand_score": float(
                    item.get("demand_score", 0) or 0
                ),
            }
        )

    skill_gap_data.sort(
        key=lambda item: (
            item["skill_gap_count"],
            item["demand_score"],
        ),
        reverse=True,
    )

    total_skill_gap = sum(
        item["skill_gap_count"]
        for item in skill_gap_data
    )

    critical_skill_gaps = [
        item
        for item in skill_gap_data
        if item["gap_percentage"] >= 75
    ][:10]

    # ============================================================
    # EMERGING SKILLS
    # ============================================================

    emerging_skills = get_emerging_skills(
        db,
        limit=10,
    )

    # ============================================================
    # TRAINING REQUIREMENTS
    # ============================================================

    training_requirements = get_training_requirements(
        db,
        limit=10,
    )

    # ============================================================
    # RECENT SYSTEM ACTIVITY
    # ============================================================

    recent_audits = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_activity = [
        {
            "id": audit.id,
            "user_id": audit.user_id,
            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "details": audit.details,
            "created_at": audit.created_at,
        }
        for audit in recent_audits
    ]

    # ============================================================
    # PLATFORM SUMMARY
    # ============================================================

    return {
        "scope": "NATIONAL",
        "overview": {
            "total_institutions": total_institutions,
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_practitioners": practitioner_count,
            "total_industries": total_industries,
            "total_skills": total_skills,
            "total_assessed_skills": total_assessed_skills,
            "open_internships": open_internships,
            "open_jobs": open_jobs,
            "total_applications": total_applications,
        },
        "industry_skill_demand": {
            "total_skills": len(demand_results),
            "results": demand_results,
            "top_skills": top_demanded_skills,
        },
        "placement_intelligence": placement_intelligence,
        "skill_gap_intelligence": {
            "total_skill_gap": total_skill_gap,
            "skills_with_gap": len(
                [
                    item
                    for item in skill_gap_data
                    if item["skill_gap_count"] > 0
                ]
            ),
            "critical_gaps": critical_skill_gaps,
            "results": skill_gap_data[:20],
        },
        "emerging_skills": emerging_skills,
        "training_requirements": training_requirements,
        "recent_system_activity": {
            "count": len(recent_activity),
            "results": recent_activity,
        },
    }
