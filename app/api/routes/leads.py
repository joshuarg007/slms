from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Header
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.db.session import SessionLocal
from app.db import models
from app.schemas.lead import LeadCreate
from app.crud import lead as lead_crud
from app.integrations.hubspot import create_contact
from app.api.routes.auth import get_current_user  # reuse auth dependency

router = APIRouter()

# Local DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Public lead intake ----
@router.post("/public/leads", response_model=dict)
def public_create_lead(
    lead: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_org_key: Optional[str] = Header(None, alias="X-Org-Key"),
):
    if not x_org_key:
        raise HTTPException(status_code=401, detail="Missing X-Org-Key")

    org = db.query(models.Organization).filter(models.Organization.api_key == x_org_key).first()
    if not org:
        raise HTTPException(status_code=401, detail="Invalid X-Org-Key")

    lead = LeadCreate(**lead.model_dump(exclude={"organization_id"}), organization_id=org.id)
    db_lead = lead_crud.create_lead(db, lead)

    background_tasks.add_task(
        create_contact,
        email=db_lead.email,
        first_name=getattr(db_lead, "first_name", None),
        last_name=getattr(db_lead, "last_name", None),
        phone=getattr(db_lead, "phone", None),
        organization_id=db_lead.organization_id,
    )
    return {"message": "Lead received", "lead_id": db_lead.id}

# ---- Internal leads list ----
def _lead_to_dict(l):
    return {
        "id": getattr(l, "id", None),
        "name": getattr(l, "name", None),
        "first_name": getattr(l, "first_name", None),
        "last_name": getattr(l, "last_name", None),
        "email": getattr(l, "email", None),
        "phone": getattr(l, "phone", None),
        "company": getattr(l, "company", None),
        "source": getattr(l, "source", None),
        "notes": getattr(l, "notes", None),
        "organization_id": getattr(l, "organization_id", None),
        "created_at": getattr(l, "created_at", None).isoformat() if getattr(l, "created_at", None) else None,
    }

@router.get("/leads")
def get_leads(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    organization_id = current_user.organization_id
    if organization_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    items: List[models.Lead] = lead_crud.get_leads(db, organization_id=organization_id)

    if q:
        q_lower = q.lower()
        def _hit(l: models.Lead) -> bool:
            return any(
                (getattr(l, f) or "").lower().find(q_lower) >= 0
                for f in ("email", "name", "first_name", "last_name", "phone", "company", "source", "notes")
            )
        items = [i for i in items if _hit(i)]

    reverse = (dir.lower() == "desc")
    def _key(l: models.Lead):
        v = getattr(l, sort, None)
        return (v is None, v)

    try:
        items.sort(key=_key, reverse=reverse)
    except Exception:
        items.sort(
            key=lambda l: (getattr(l, "created_at", None) is None, getattr(l, "created_at", None)),
            reverse=True,
        )

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return {
        "items": [_lead_to_dict(i) for i in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": end < total,
        "has_prev": page > 1,
        "sort": sort,
        "dir": dir,
        "q": q or "",
        "organization_id": organization_id,
    }

# ---- Dashboard metrics ----
@router.get("/dashboard/metrics", response_model=dict)
def dashboard_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="No organization assigned")

    total = db.query(models.Lead).filter(models.Lead.organization_id == org_id).count()
    by_source_rows = (
        db.query(models.Lead.source, sa.func.count(models.Lead.id))
        .filter(models.Lead.organization_id == org_id)
        .group_by(models.Lead.source)
        .all()
    )
    by_source = {k or "unknown": v for k, v in by_source_rows}

    return {"total": total, "by_source": by_source}
