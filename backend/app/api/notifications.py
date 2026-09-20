from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.database import get_db
from app.models.notification import Notification


router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("/my")
def get_my_notifications(
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "STUDENT",
            "INDUSTRY",
            "RESEARCHER",
            "PRACTITIONER",
        )
    ),
    db: Session = Depends(get_db),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = sum(
        1 for notification in notifications
        if not notification.is_read
    )

    return {
        "total": len(notifications),
        "unread": unread_count,
        "notifications": [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "reference_type": notification.reference_type,
                "reference_id": notification.reference_id,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
            }
            for notification in notifications
        ],
    }


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "STUDENT",
            "INDUSTRY",
            "RESEARCHER",
            "PRACTITIONER",
        )
    ),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    current_user=Depends(
        require_roles(
            "SUPER_ADMIN",
            "NATIONAL_ADMIN",
            "STATE_ADMIN",
            "INSTITUTION_ADMIN",
            "FACULTY",
            "STUDENT",
            "INDUSTRY",
            "RESEARCHER",
            "PRACTITIONER",
        )
    ),
    db: Session = Depends(get_db),
):
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": len(notifications),
    }