"""User management routes for organization users."""

from typing import Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import models
from app.api.routes.auth import get_current_user
from app.core.security import get_password_hash

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_default: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    role: str = "USER"


class SetDefaultRequest(BaseModel):
    user_id: int


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users in the current user's organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    users = (
        db.query(models.User)
        .filter(models.User.organization_id == org_id)
        .order_by(models.User.created_at.asc())
        .all()
    )

    return [
        UserOut(
            id=u.id,
            email=u.email,
            role=getattr(u, "role", None) or "USER",
            is_default=getattr(u, "is_default", False) or False,
            created_at=u.created_at.isoformat() if getattr(u, "created_at", None) else None,
        )
        for u in users
    ]


@router.post("/users", response_model=UserOut)
def create_user(
    user_data: UserCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create/invite a new user to the organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Check if requester has permission (OWNER or ADMIN)
    requester_role = getattr(current_user, "role", "USER") or "USER"
    if requester_role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can add users")

    # Validate role
    valid_roles = {"OWNER", "ADMIN", "USER", "READ_ONLY"}
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Only OWNER can create other OWNERs
    if user_data.role == "OWNER" and requester_role != "OWNER":
        raise HTTPException(status_code=403, detail="Only OWNER can assign OWNER role")

    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Generate a temporary password (user will need to reset)
    temp_password = secrets.token_urlsafe(12)

    new_user = models.User(
        email=user_data.email.lower(),
        hashed_password=get_password_hash(temp_password),
        organization_id=org_id,
        role=user_data.role,
        is_default=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # TODO: Send invitation email with temp password or reset link

    return UserOut(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role or "USER",
        is_default=new_user.is_default or False,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
    )


@router.post("/users/default")
def set_default_user(
    request: SetDefaultRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set the default user for the organization."""
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    # Check if requester has permission
    requester_role = getattr(current_user, "role", "USER") or "USER"
    if requester_role not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only OWNER or ADMIN can change default user")

    # Verify the target user exists and is in the same org
    target_user = db.query(models.User).filter(
        models.User.id == request.user_id,
        models.User.organization_id == org_id,
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your organization")

    # Clear is_default for all users in org
    db.query(models.User).filter(
        models.User.organization_id == org_id
    ).update({"is_default": False})

    # Set the new default
    target_user.is_default = True
    db.commit()

    return {"ok": True, "default_user_id": target_user.id}
