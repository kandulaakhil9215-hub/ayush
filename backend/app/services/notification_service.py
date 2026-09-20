from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_type=reference_type,
        reference_id=reference_id,
    )

    db.add(notification)

    return notification


def notify_application_status(
    db: Session,
    user_id: int,
    application_id: int,
    status: str,
):
    create_notification(
        db=db,
        user_id=user_id,
        title="Application Status Updated",
        message=(
            f"Your application #{application_id} "
            f"has been updated to {status}."
        ),
        notification_type="APPLICATION_STATUS",
        reference_type="APPLICATION",
        reference_id=application_id,
    )


def notify_skill_verification(
    db: Session,
    user_id: int,
    skill_id: int,
    skill_name: str,
):
    create_notification(
        db=db,
        user_id=user_id,
        title="Skill Verified",
        message=(
            f"Your skill '{skill_name}' has been "
            "verified successfully."
        ),
        notification_type="SKILL_VERIFICATION",
        reference_type="SKILL",
        reference_id=skill_id,
    )


def notify_internship_completion(
    db: Session,
    user_id: int,
    completion_id: int,
):
    create_notification(
        db=db,
        user_id=user_id,
        title="Internship Completion Verified",
        message=(
            "Your internship completion record "
            "has been verified."
        ),
        notification_type="INTERNSHIP_COMPLETION",
        reference_type="INTERNSHIP_COMPLETION",
        reference_id=completion_id,
    )


def notify_shortlisted(
    db: Session,
    user_id: int,
    application_id: int,
):
    create_notification(
        db=db,
        user_id=user_id,
        title="You Have Been Shortlisted",
        message=(
            f"Your application #{application_id} "
            "has been shortlisted."
        ),
        notification_type="SHORTLISTED",
        reference_type="APPLICATION",
        reference_id=application_id,
    )


def notify_new_opportunity(
    db: Session,
    user_id: int,
    opportunity_id: int,
    opportunity_type: str,
    title: str,
):
    create_notification(
        db=db,
        user_id=user_id,
        title="New Opportunity Recommended",
        message=(
            f"A new {opportunity_type.lower()} "
            f"'{title}' matches your profile."
        ),
        notification_type="OPPORTUNITY",
        reference_type=opportunity_type.upper(),
        reference_id=opportunity_id,
    )