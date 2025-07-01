from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

# -------- Shared props --------
class LeadBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = "new"
    source_id: Optional[int] = None

# -------- What the client sends --------
class LeadCreate(LeadBase):
    pass            # all fields above are allowed on create

# -------- What we send back --------
class LeadOut(LeadBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True   # 👈 lets FastAPI read SQLAlchemy objects
