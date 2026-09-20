from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.assessment import (
    Assessment,
    AssessmentVersion,
    Question,
    AssessmentAttempt,
    AssessmentAnswer,
    AssessmentResult,
)
from app.models.identity import Student, User
from app.models.skills import StudentSkill, SkillLevel, Skill
from app.core.permissions import require_roles


router = APIRouter(
    prefix="/api/assessments",
    tags=["Assessments"],
)


class AssessmentSubmitRequest(BaseModel):
    answers: dict[str, str]


# ============================================================
# GET ALL ACTIVE ASSESSMENTS
# ============================================================

@router.get("/")
def get_assessments(
    db: Session = Depends(get_db),
):
    assessments = (
        db.query(Assessment)
        .filter(Assessment.is_active == True)
        .all()
    )

    result = []

    for assessment in assessments:
        active_version = (
            db.query(AssessmentVersion)
            .filter(
                AssessmentVersion.assessment_id == assessment.id,
                AssessmentVersion.is_active == True,
            )
            .order_by(AssessmentVersion.version_number.desc())
            .first()
        )

        result.append(
            {
                "id": assessment.id,
                "name": assessment.name,
                "description": assessment.description,
                "assessment_type": assessment.assessment_type,
                "ayush_system_id": assessment.ayush_system_id,
                "version": (
                    active_version.version_number
                    if active_version
                    else None
                ),
                "duration_minutes": (
                    active_version.duration_minutes
                    if active_version
                    else None
                ),
                "passing_score": (
                    active_version.passing_score
                    if active_version
                    else None
                ),
            }
        )

    return {
        "count": len(result),
        "assessments": result,
    }





# ============================================================
# MY ASSESSMENT RESULTS
# ============================================================

@router.get("/my-results")
def get_my_results(
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    attempts = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.student_id == student.id,
            AssessmentAttempt.status == "SUBMITTED",
        )
        .order_by(AssessmentAttempt.submitted_at.desc())
        .all()
    )

    results = []

    for attempt in attempts:
        version = db.get(
            AssessmentVersion,
            attempt.assessment_version_id,
        )

        assessment = (
            db.get(Assessment, version.assessment_id)
            if version
            else None
        )

        skill_results = (
            db.query(AssessmentResult)
            .filter(AssessmentResult.attempt_id == attempt.id)
            .all()
        )

        results.append(
            {
                "attempt_id": attempt.id,
                "assessment": (
                    assessment.name if assessment else None
                ),
                "version": (
                    version.version_number if version else None
                ),
                "submitted_at": attempt.submitted_at,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "skills": [
                    {
                        "skill_id": result.skill_id,
                        "score": result.score,
                        "verified": result.verified,
                    }
                    for result in skill_results
                ],
            }
        )

    return {
        "student_id": student.id,
        "count": len(results),
        "results": results,
    }

# ============================================================
# FACULTY ASSESSMENT RESULTS
# ============================================================

@router.get("/faculty/results")
def get_faculty_results(
    current_user=Depends(require_roles("FACULTY", "ACADEMIAN")),
    db: Session = Depends(get_db),
):
    """
    Return submitted assessment results for students belonging to
    the faculty member's institution.
    """

    faculty = current_user.faculty_profile

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile not found",
        )

    institution_id = faculty.institution_id

    attempts = (
        db.query(AssessmentAttempt)
        .join(Student, Student.id == AssessmentAttempt.student_id)
        .filter(
            Student.institution_id == institution_id,
            AssessmentAttempt.status == "SUBMITTED",
        )
        .order_by(AssessmentAttempt.submitted_at.desc())
        .all()
    )

    results = []

    for attempt in attempts:
        student = db.get(Student, attempt.student_id)
        version = db.get(AssessmentVersion, attempt.assessment_version_id)

        assessment = (
            db.get(Assessment, version.assessment_id)
            if version
            else None
        )

        user = (
            db.get(User, student.user_id)
            if student
            else None
        )

        skill_results = (
            db.query(AssessmentResult, Skill)
            .join(Skill, Skill.id == AssessmentResult.skill_id)
            .filter(AssessmentResult.attempt_id == attempt.id)
            .all()
        )

        results.append(
            {
                "attempt_id": attempt.id,
                "student_id": student.id if student else None,
                "student_name": user.full_name if user else None,
                "student_identifier": student.student_id if student else None,
                "institution_id": student.institution_id if student else None,
                "department": student.department if student else None,
                "degree": student.degree if student else None,
                "cgpa": student.cgpa if student else None,
                "assessment_id": assessment.id if assessment else None,
                "assessment_name": assessment.name if assessment else None,
                "assessment_type": (
                    assessment.assessment_type
                    if assessment
                    else None
                ),
                "version": (
                    version.version_number
                    if version
                    else None
                ),
                "submitted_at": attempt.submitted_at,
                "total_score": attempt.total_score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "skills": [
                    {
                        "skill_id": result.skill_id,
                        "skill_name": skill.name,
                        "score": result.score,
                        "level_id": result.level_id,
                        "verified": result.verified,
                    }
                    for result, skill in skill_results
                ],
            }
        )

    return {
        "institution_id": institution_id,
        "count": len(results),
        "results": results,
    }


# ============================================================
# GET SINGLE ASSESSMENT
# ============================================================

@router.get("/{assessment_id}")
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if not assessment or not assessment.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    version = (
        db.query(AssessmentVersion)
        .filter(
            AssessmentVersion.assessment_id == assessment.id,
            AssessmentVersion.is_active == True,
        )
        .order_by(AssessmentVersion.version_number.desc())
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment version found",
        )

    questions = (
        db.query(Question)
        .filter(Question.assessment_version_id == version.id)
        .order_by(Question.id)
        .all()
    )

    return {
        "id": assessment.id,
        "name": assessment.name,
        "description": assessment.description,
        "assessment_type": assessment.assessment_type,
        "ayush_system_id": assessment.ayush_system_id,
        "version": version.version_number,
        "instructions": version.instructions,
        "duration_minutes": version.duration_minutes,
        "passing_score": version.passing_score,
        "total_questions": len(questions),
        "questions": [
            {
                "id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "options": (
                    question.options.split("|||")
                    if question.options
                    else []
                ),
                "difficulty": question.difficulty,
                "marks": question.marks,
            }
            for question in questions
        ],
    }


# ============================================================
# START ASSESSMENT
# ============================================================

@router.post(
    "/{assessment_id}/start",
    status_code=status.HTTP_201_CREATED,
)
def start_assessment(
    assessment_id: int,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    assessment = db.get(Assessment, assessment_id)

    if not assessment or not assessment.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    version = (
        db.query(AssessmentVersion)
        .filter(
            AssessmentVersion.assessment_id == assessment.id,
            AssessmentVersion.is_active == True,
        )
        .order_by(AssessmentVersion.version_number.desc())
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment version found",
        )

    # Prevent multiple active attempts
    existing_attempt = (
        db.query(AssessmentAttempt)
        .filter(
            AssessmentAttempt.student_id == student.id,
            AssessmentAttempt.assessment_version_id == version.id,
            AssessmentAttempt.status == "IN_PROGRESS",
        )
        .first()
    )

    if existing_attempt:
        return {
            "message": "Existing assessment attempt resumed",
            "attempt_id": existing_attempt.id,
            "assessment_id": assessment.id,
            "version": version.version_number,
        }

    # Create new attempt
    attempt = AssessmentAttempt(
        student_id=student.id,
        assessment_version_id=version.id,
        status="IN_PROGRESS",
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "message": "Assessment started successfully",
        "attempt_id": attempt.id,
        "assessment_id": assessment.id,
        "version": version.version_number,
        "duration_minutes": version.duration_minutes,
    }


# ============================================================
# SUBMIT ASSESSMENT
# ============================================================

@router.post("/attempts/{attempt_id}/submit")
def submit_assessment(
    attempt_id: int,
    request: AssessmentSubmitRequest,
    current_user=Depends(require_roles("STUDENT")),
    db: Session = Depends(get_db),
):
    answers = request.answers

    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    attempt = db.get(AssessmentAttempt, attempt_id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    if attempt.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot submit this assessment attempt",
        )

    if attempt.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment attempt has already been submitted",
        )

    # Get questions
    questions = (
        db.query(Question)
        .filter(
            Question.assessment_version_id
            == attempt.assessment_version_id
        )
        .all()
    )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment contains no questions",
        )

    # Calculate score
    total_score = 0
    max_score = 0
    skill_scores = {}

    for question in questions:
        max_score += question.marks

        selected_answer = answers.get(str(question.id))

        is_correct = (
            selected_answer is not None
            and selected_answer == question.correct_answer
        )

        marks_obtained = question.marks if is_correct else 0
        total_score += marks_obtained

        # Save answer
        answer_record = AssessmentAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_answer=selected_answer,
            is_correct=is_correct,
            marks_obtained=marks_obtained,
        )
        db.add(answer_record)

        # Calculate skill score
        for question_skill in question.question_skills:
            skill_id = question_skill.skill_id

            if skill_id not in skill_scores:
                skill_scores[skill_id] = {
                    "obtained": 0,
                    "maximum": 0,
                }

            weighted_marks = question.marks * question_skill.weight

            skill_scores[skill_id]["maximum"] += weighted_marks

            if is_correct:
                skill_scores[skill_id]["obtained"] += weighted_marks

    # Overall percentage
    percentage = (
        (total_score / max_score) * 100
        if max_score > 0
        else 0
    )

    version = db.get(
        AssessmentVersion,
        attempt.assessment_version_id,
    )

    passed = percentage >= version.passing_score

    # Update attempt
    attempt.status = "SUBMITTED"
    attempt.submitted_at = datetime.utcnow()
    attempt.total_score = total_score
    attempt.percentage = percentage
    attempt.passed = passed

    # Save skill results + update student skill profile
    skill_result_response = []

    for skill_id, data in skill_scores.items():
        skill_percentage = (
            data["obtained"] / data["maximum"] * 100
            if data["maximum"] > 0
            else 0
        )

        # Determine skill level from score
        skill_level = (
            db.query(SkillLevel)
            .filter(
                SkillLevel.min_score <= skill_percentage,
                SkillLevel.max_score >= skill_percentage,
            )
            .first()
        )

        # Save assessment result with skill level
        result = AssessmentResult(
            attempt_id=attempt.id,
            skill_id=skill_id,
            score=skill_percentage,
            level_id=skill_level.id if skill_level else None,
            verified=False,
        )
        db.add(result)

        # Update student's skill profile
        student_skill = (
            db.query(StudentSkill)
            .filter(
                StudentSkill.student_id == student.id,
                StudentSkill.skill_id == skill_id,
            )
            .first()
        )

        if student_skill:
            # Keep the highest assessed score
            if (
                student_skill.score is None
                or skill_percentage > student_skill.score
            ):
                student_skill.score = skill_percentage

            student_skill.source = "ASSESSMENT"
            student_skill.last_assessed_at = datetime.utcnow()

        else:
            student_skill = StudentSkill(
                student_id=student.id,
                skill_id=skill_id,
                score=skill_percentage,
                verified=False,
                source="ASSESSMENT",
                last_assessed_at=datetime.utcnow(),
            )
            db.add(student_skill)

        # Update current skill level
        if skill_level:
            student_skill.skill_level_id = skill_level.id

        skill_result_response.append(
            {
                "skill_id": skill_id,
                "score": round(skill_percentage, 2),
                "level": skill_level.name if skill_level else None,
            }
        )

    db.commit()

    return {
        "message": "Assessment submitted successfully",
        "attempt_id": attempt.id,
        "total_score": total_score,
        "max_score": max_score,
        "percentage": round(percentage, 2),
        "passed": passed,
        "skill_results": skill_result_response,
    }
