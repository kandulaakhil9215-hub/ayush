from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.identity import Institution, Student, Faculty, Industry
from app.models.skills import Skill, StudentSkill
from app.models.opportunities import Internship, Job
from app.models.applications import Application
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
    return {
        "scope": "NATIONAL",
        "overview": {
            "total_institutions": db.query(Institution).filter(Institution.is_active.is_(True)).count(),
            "total_students": db.query(Student).count(),
            "total_faculty": db.query(Faculty).count(),
            "total_industries": db.query(Industry).count(),
            "total_skills": db.query(Skill).count(),
            "total_assessed_skills": db.query(StudentSkill).filter(StudentSkill.score.isnot(None)).count(),
            "open_internships": db.query(Internship).filter(Internship.status == "OPEN").count(),
            "open_jobs": db.query(Job).filter(Job.status == "OPEN").count(),
            "total_applications": db.query(Application).count(),
        },
    }
