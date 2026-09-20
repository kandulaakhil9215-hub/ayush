from app.models.identity import (
    Role,
    User,
    Institution,
    Student,
    Faculty,
    Industry,
)

from app.models.skills import (
    AyushSystem,
    SkillCategory,
    Skill,
    SkillLevel,
    StudentSkill,
)

from app.models.assessment import (
    Assessment,
    AssessmentVersion,
    Question,
    QuestionSkill,
    AssessmentAttempt,
    AssessmentAnswer,
    AssessmentResult,
)

from app.models.career import (
    CareerRole,
    CareerRoleSkill,
    CareerPath,
    CareerPathStep,
)

from app.models.skill_gap import SkillGap

from app.models.opportunities import (
    Internship,
    Job,
    OpportunitySkill,
)

from app.models.applications import (
    Application,
    ApplicationStatusHistory,
)

from app.models.eligibility import EligibilityRule

from app.models.shortlist import Shortlist

from app.models.internship_progress import InternshipProgress

from app.models.internship_completion import InternshipCompletion

from app.models.portfolio import Portfolio

from app.models.consent import Consent

from app.models.learning import (
    Course,
    CourseSkill,
)
from app.models.skill_demand import SkillDemand
from app.models.prediction import Prediction
from app.models.collaboration import (
    Collaboration,
    GuestLecture,
    InnovationChallenge,
    Consultancy,
    Partnership,
)
from app.models.notification import Notification
from app.models.audit import AuditLog
__all__ = [
    "Role",
    "User",
    "Institution",
    "Student",
    "Faculty",
    "Industry",

    "AyushSystem",
    "SkillCategory",
    "Skill",
    "SkillLevel",
    "StudentSkill",

    "Assessment",
    "AssessmentVersion",
    "Question",
    "QuestionSkill",
    "AssessmentAttempt",
    "AssessmentAnswer",
    "AssessmentResult",

    "CareerRole",
    "CareerRoleSkill",

    "SkillGap",

    "Internship",
    "Job",
    "OpportunitySkill",

    "Application",
    "ApplicationStatusHistory",

    "EligibilityRule",

    "Shortlist",

    "InternshipProgress",

    "InternshipCompletion",

    "Portfolio",

    "Consent",

    "Course",
    "CourseSkill",
    "SkillDemand",


    "Prediction",
]