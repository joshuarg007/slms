from fastapi import APIRouter, Depends
from app.api.deps.auth import get_current_user

router = APIRouter(prefix="/integrations/current", tags=["Integrations"])

@router.get("/")
async def current_crm_overview(user=Depends(get_current_user)):
    return {
        "message": "Current CRM overview placeholder",
        "organization_id": user.organization_id,
    }
