from pydantic import BaseModel

class HubSpotContact(BaseModel):
    email: str
    first_name: str = ""
    last_name: str = ""
    phone: str = ""
