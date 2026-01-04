from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...db import models
from ...schemas.dashboard import DashboardMetrics
from ...crud import lead as lead_crud
from .auth import get_current_user

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return lead_crud.get_lead_metrics(db)
