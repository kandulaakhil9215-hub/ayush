from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.collaboration import (
    Collaboration,
    GuestLecture,
    InnovationChallenge,
    Consultancy,
    Partnership,
)
from app.models.identity import Industry, Institution, Faculty


router = APIRouter(
    prefix="/api/collaboration",
    tags=["Industry Academia Collaboration"],
)


class CollaborationCreate(BaseModel):
    institution_id: int
    faculty_id: int | None = None
    title: str = Field(min_length=3, max_length=300)
    collaboration_type: str
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class GuestLectureCreate(BaseModel):
    institution_id: int
    faculty_id: int | None = None
    title: str = Field(min_length=3, max_length=300)
    topic: str = Field(min_length=3, max_length=500)
    description: str | None = None
    scheduled_at: datetime | None = None
    mode: str = "ONLINE"


class InnovationChallengeCreate(BaseModel):
    institution_id: int
    title: str = Field(min_length=3, max_length=300)
    problem_statement: str = Field(min_length=10)
    description: str | None = None
    deadline: datetime | None = None


class ConsultancyCreate(BaseModel):
    institution_id: int
    faculty_id: int | None = None
    title: str = Field(min_length=3, max_length=300)
    description: str = Field(min_length=10)
    start_date: datetime | None = None
    end_date: datetime | None = None


class PartnershipCreate(BaseModel):
    institution_id: int
    title: str = Field(min_length=3, max_length=300)
    description: str | None = None
    agreement_type: str = "COLLABORATION"
    start_date: datetime | None = None
    end_date: datetime | None = None


def get_industry(
    current_user,
    db: Session,
):
    industry = (
        db.query(Industry)
        .filter(Industry.user_id == current_user.id)
        .first()
    )

    if not industry:
        raise HTTPException(
            status_code=404,
            detail="Industry profile not found",
        )

    return industry


def validate_institution(
    institution_id: int,
    db: Session,
):
    institution = (
        db.query(Institution)
        .filter(Institution.id == institution_id)
        .first()
    )

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found",
        )

    return institution


def validate_faculty(
    faculty_id: int | None,
    institution_id: int,
    db: Session,
):
    if faculty_id is None:
        return None

    faculty = (
        db.query(Faculty)
        .filter(Faculty.id == faculty_id)
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found",
        )

    if faculty.institution_id != institution_id:
        raise HTTPException(
            status_code=400,
            detail="Faculty does not belong to the selected institution",
        )

    return faculty


# ---------------------------------------------------------
# Collaboration proposals
# ---------------------------------------------------------

@router.post("/proposals")
def create_collaboration(
    request: CollaborationCreate,
    current_user=Depends(
        require_roles("INDUSTRY", "INSTITUTION_ADMIN", "FACULTY")
    ),
    db: Session = Depends(get_db),
):
    industry = get_industry(current_user, db)

    validate_institution(request.institution_id, db)
    validate_faculty(
        request.faculty_id,
        request.institution_id,
        db,
    )

    collaboration = Collaboration(
        industry_id=industry.id,
        institution_id=request.institution_id,
        faculty_id=request.faculty_id,
        title=request.title,
        collaboration_type=request.collaboration_type.upper(),
        description=request.description,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    db.add(collaboration)
    db.commit()
    db.refresh(collaboration)

    return {
        "message": "Collaboration proposal created successfully",
        "collaboration_id": collaboration.id,
        "status": collaboration.status,
    }


@router.get("/proposals")
def list_collaborations(
    current_user=Depends(
        require_roles(
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    collaborations = (
        db.query(Collaboration)
        .order_by(Collaboration.created_at.desc())
        .all()
    )

    return {
        "count": len(collaborations),
        "collaborations": [
            {
                "id": item.id,
                "industry_id": item.industry_id,
                "institution_id": item.institution_id,
                "faculty_id": item.faculty_id,
                "title": item.title,
                "collaboration_type": item.collaboration_type,
                "description": item.description,
                "start_date": item.start_date,
                "end_date": item.end_date,
                "status": item.status,
                "verified": item.verified,
                "created_at": item.created_at,
            }
            for item in collaborations
        ],
    }


# ---------------------------------------------------------
# Guest lectures
# ---------------------------------------------------------

@router.post("/guest-lectures")
def create_guest_lecture(
    request: GuestLectureCreate,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    industry = get_industry(current_user, db)

    validate_institution(request.institution_id, db)
    validate_faculty(
        request.faculty_id,
        request.institution_id,
        db,
    )

    lecture = GuestLecture(
        industry_id=industry.id,
        institution_id=request.institution_id,
        faculty_id=request.faculty_id,
        title=request.title,
        topic=request.topic,
        description=request.description,
        scheduled_at=request.scheduled_at,
        mode=request.mode.upper(),
    )

    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return {
        "message": "Guest lecture created successfully",
        "guest_lecture_id": lecture.id,
        "status": lecture.status,
    }


@router.get("/guest-lectures")
def list_guest_lectures(
    current_user=Depends(
        require_roles(
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    lectures = (
        db.query(GuestLecture)
        .order_by(GuestLecture.created_at.desc())
        .all()
    )

    return {
        "count": len(lectures),
        "guest_lectures": [
            {
                "id": lecture.id,
                "industry_id": lecture.industry_id,
                "institution_id": lecture.institution_id,
                "faculty_id": lecture.faculty_id,
                "title": lecture.title,
                "topic": lecture.topic,
                "description": lecture.description,
                "scheduled_at": lecture.scheduled_at,
                "mode": lecture.mode,
                "status": lecture.status,
            }
            for lecture in lectures
        ],
    }


# ---------------------------------------------------------
# Innovation challenges
# ---------------------------------------------------------

@router.post("/innovation-challenges")
def create_innovation_challenge(
    request: InnovationChallengeCreate,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    industry = get_industry(current_user, db)

    validate_institution(request.institution_id, db)

    challenge = InnovationChallenge(
        industry_id=industry.id,
        institution_id=request.institution_id,
        title=request.title,
        problem_statement=request.problem_statement,
        description=request.description,
        deadline=request.deadline,
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return {
        "message": "Innovation challenge created successfully",
        "innovation_challenge_id": challenge.id,
        "status": challenge.status,
    }


@router.get("/innovation-challenges")
def list_innovation_challenges(
    current_user=Depends(
        require_roles(
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "STUDENT",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    challenges = (
        db.query(InnovationChallenge)
        .order_by(InnovationChallenge.created_at.desc())
        .all()
    )

    return {
        "count": len(challenges),
        "innovation_challenges": [
            {
                "id": challenge.id,
                "industry_id": challenge.industry_id,
                "institution_id": challenge.institution_id,
                "title": challenge.title,
                "problem_statement": challenge.problem_statement,
                "description": challenge.description,
                "deadline": challenge.deadline,
                "status": challenge.status,
            }
            for challenge in challenges
        ],
    }


# ---------------------------------------------------------
# Consultancy
# ---------------------------------------------------------

@router.post("/consultancies")
def create_consultancy(
    request: ConsultancyCreate,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    industry = get_industry(current_user, db)

    validate_institution(request.institution_id, db)
    validate_faculty(
        request.faculty_id,
        request.institution_id,
        db,
    )

    consultancy = Consultancy(
        industry_id=industry.id,
        institution_id=request.institution_id,
        faculty_id=request.faculty_id,
        title=request.title,
        description=request.description,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    db.add(consultancy)
    db.commit()
    db.refresh(consultancy)

    return {
        "message": "Consultancy created successfully",
        "consultancy_id": consultancy.id,
        "status": consultancy.status,
    }


@router.get("/consultancies")
def list_consultancies(
    current_user=Depends(
        require_roles(
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    consultancies = (
        db.query(Consultancy)
        .order_by(Consultancy.created_at.desc())
        .all()
    )

    return {
        "count": len(consultancies),
        "consultancies": [
            {
                "id": consultancy.id,
                "industry_id": consultancy.industry_id,
                "institution_id": consultancy.institution_id,
                "faculty_id": consultancy.faculty_id,
                "title": consultancy.title,
                "description": consultancy.description,
                "status": consultancy.status,
                "start_date": consultancy.start_date,
                "end_date": consultancy.end_date,
            }
            for consultancy in consultancies
        ],
    }


# ---------------------------------------------------------
# Partnerships
# ---------------------------------------------------------

@router.post("/partnerships")
def create_partnership(
    request: PartnershipCreate,
    current_user=Depends(require_roles("INDUSTRY")),
    db: Session = Depends(get_db),
):
    industry = get_industry(current_user, db)

    validate_institution(request.institution_id, db)

    partnership = Partnership(
        industry_id=industry.id,
        institution_id=request.institution_id,
        title=request.title,
        description=request.description,
        agreement_type=request.agreement_type.upper(),
        start_date=request.start_date,
        end_date=request.end_date,
    )

    db.add(partnership)
    db.commit()
    db.refresh(partnership)

    return {
        "message": "Industry-academia partnership created successfully",
        "partnership_id": partnership.id,
        "status": partnership.status,
    }


@router.get("/partnerships")
def list_partnerships(
    current_user=Depends(
        require_roles(
            "INDUSTRY",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
        )
    ),
    db: Session = Depends(get_db),
):
    partnerships = (
        db.query(Partnership)
        .order_by(Partnership.created_at.desc())
        .all()
    )

    return {
        "count": len(partnerships),
        "partnerships": [
            {
                "id": partnership.id,
                "industry_id": partnership.industry_id,
                "institution_id": partnership.institution_id,
                "title": partnership.title,
                "description": partnership.description,
                "agreement_type": partnership.agreement_type,
                "start_date": partnership.start_date,
                "end_date": partnership.end_date,
                "status": partnership.status,
                "verified": partnership.verified,
            }
            for partnership in partnerships
        ],
    }