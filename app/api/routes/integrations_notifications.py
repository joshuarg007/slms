from fastapi import APIRouter, Depends
from app.api.deps.auth import get_current_user

router = APIRouter(prefix="/integrations/notifications", tags=["Integrations"])

@router.get("/")
async def notifications_page(user=Depends(get_current_user)):
    return {
        "message": "Alerts and Notifications placeholder",
        "organization_id": user.organization_id,
    }
