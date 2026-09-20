from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.database_test import router as database_router
from app.api.student_skills import router as student_skills_router
from app.api.auth import router as auth_router
from app.api.assessments import router as assessments_router
from app.api.skill_gaps import router as skill_gaps_router
from app.api.career_matching import router as career_matching_router
from app.api.opportunities import router as opportunities_router
from app.api.applications import router as applications_router
from app.api.industry_applications import router as industry_applications_router
from app.api.industry_opportunities import router as industry_opportunities_router
from app.api.industry_opportunity_skills import (
router as industry_opportunity_skills_router,
)
from app.api.industry_jobs import router as industry_jobs_router
from app.api.student_opportunities import router as student_opportunities_router
from app.api.internship_progress import router as internship_progress_router
from app.api.faculty_mentorship import router as faculty_mentorship_router
from app.api.portfolio import router as portfolio_router
from app.api.internship_completion import router as internship_completion_router
from app.api.skill_verification import router as skill_verification_router
from app.api.industry_verified_skills import (
router as industry_verified_skills_router,
)
from app.api.consent import router as consent_router
from app.api.learning_recommendations import (
router as learning_recommendations_router,
)
from app.api.career_path import router as career_path_router
from app.api.skill_demand import router as skill_demand_router
from app.api.analytics import router as analytics_router
from app.api.placement_prediction import router as placement_prediction_router
from app.api.skill_forecasting import router as skill_forecasting_router
from app.api.collaboration import router as collaboration_router
from app.api.notifications import router as notifications_router
from app.api.audit import router as audit_router
from app.api.faculty_profile import router as faculty_profile_router
from app.api.admin_dashboard import router as admin_dashboard_router

app = FastAPI(
title="Academia-Industry Skill Mapping Platform",
description="AYUSH Academia-Industry Skill Mapping & Collaboration Platform",
version="1.0.0",
)

# ============================================================

# CORS

# ============================================================

app.add_middleware(
CORSMiddleware,
allow_origins=[
"http://localhost:5173",
"http://127.0.0.1:5173",
"http://localhost:5174",
"http://127.0.0.1:5174",
],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

# ============================================================

# HEALTH CHECK

# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Academia-Industry Skill Mapping Platform",
        "database": "PostgreSQL",
    }

# ============================================================

# ROUTERS

# ============================================================

app.include_router(database_router)

# Student

app.include_router(student_skills_router)

# Authentication

app.include_router(auth_router)

# Assessments

app.include_router(assessments_router)

# Skill gaps

app.include_router(skill_gaps_router)

# Career matching

app.include_router(career_matching_router)

# Opportunities

app.include_router(opportunities_router)

# Applications

app.include_router(applications_router)

# Industry applications

app.include_router(industry_applications_router)

# Industry opportunities

app.include_router(industry_opportunities_router)

# Industry opportunity skills

app.include_router(industry_opportunity_skills_router)

# Industry jobs

app.include_router(industry_jobs_router)

# Student opportunities

app.include_router(student_opportunities_router)

# Internship progress

app.include_router(internship_progress_router)

# Faculty mentorship

app.include_router(faculty_mentorship_router)

# Portfolio

app.include_router(portfolio_router)

# Internship completion

app.include_router(internship_completion_router)

# Skill verification

app.include_router(skill_verification_router)

# Industry verified skills

app.include_router(industry_verified_skills_router)

# Consent

app.include_router(consent_router)

# Learning recommendations

app.include_router(learning_recommendations_router)

# Career path

app.include_router(career_path_router)

# Skill demand analytics

app.include_router(skill_demand_router)

# Platform analytics

app.include_router(analytics_router)

# Placement prediction

app.include_router(placement_prediction_router)

# Skill forecasting

app.include_router(skill_forecasting_router)

# Industry-academia collaboration

app.include_router(collaboration_router)

# Notifications

app.include_router(notifications_router)

# Audit

app.include_router(audit_router)

# Faculty profile

app.include_router(faculty_profile_router)

# Admin dashboard

app.include_router(admin_dashboard_router)
