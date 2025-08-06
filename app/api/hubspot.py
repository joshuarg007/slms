from fastapi import APIRouter, HTTPException
from app.integrations.hubspot import create_contact
from app.schemas.hubspot import HubSpotContact

router = APIRouter()

@router.post("/hubspot/test")
async def test_hubspot_contact(contact: HubSpotContact):
    try:
        result = await create_contact(
            email=contact.email,
            first_name=contact.first_name,
            last_name=contact.last_name,
            phone=contact.phone
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
