from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.database import get_db
from app.models.identity import User
from sqlalchemy.orm import Session


def require_roles(*allowed_roles: str):

    def role_checker(
        user_id: int = Depends(get_current_user_id),
        db: Session = Depends(get_db),
    ):

        user = db.get(User, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        user_roles = {
            role.name
            for role in user.roles
        }

        if not user_roles.intersection(
            set(allowed_roles)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return user

    return role_checker