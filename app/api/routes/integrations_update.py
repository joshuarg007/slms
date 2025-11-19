from fastapi import APIRouter, Depends
from app.api.deps.auth import get_current_user

router = APIRouter(prefix="/integrations/update", tags=["Integrations"])

@router.get("/")
async def update_crm_page(user=Depends(get_current_user)):
    return {
        "message": "Update CRM placeholder",
        "organization_id": user.organization_id,
    }
