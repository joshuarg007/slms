from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class LeadBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=5000)
    source: Optional[str] = Field(None, max_length=100)
    organization_id: Optional[int] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=5000)
    source: Optional[str] = Field(None, max_length=100)
    organization_id: Optional[int] = None
    email: Optional[EmailStr] = None

class LeadRead(LeadBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # or orm_mode = True on Pydantic v1
