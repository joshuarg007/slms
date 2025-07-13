from pydantic import BaseModel, EmailStr
from typing import Optional

class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
