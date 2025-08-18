from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class LeadBase(BaseModel):
    email: EmailStr
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    organization_id: Optional[int] = None  # <-- add this

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    organization_id: Optional[int] = None  # <-- add this
    email: Optional[EmailStr] = None

class LeadRead(LeadBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # or orm_mode = True on Pydantic v1
