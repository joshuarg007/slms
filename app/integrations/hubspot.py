import httpx
from app.core.config import settings

HUBSPOT_BASE_URL = "https://api.hubapi.com"

async def create_contact(email: str, first_name: str = "", last_name: str = "", phone: str = ""):
    url = f"{HUBSPOT_BASE_URL}/crm/v3/objects/contacts"
    headers = {
        "Authorization": f"Bearer {settings.hubspot_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "properties": {
            "email": email,
            "firstname": first_name,
            "lastname": last_name,
            "phone": phone
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
