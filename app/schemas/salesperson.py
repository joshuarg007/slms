from typing import List, Optional
from pydantic import BaseModel


class SalespersonStat(BaseModel):
    # shape for a single rep
    owner_id: str
    owner_name: str
    owner_email: Optional[str] = None
    emails_last_n_days: int
    calls_last_n_days: int
    meetings_last_n_days: int
    new_deals_last_n_days: int


class SalespersonStatsResponse(BaseModel):
    # wrapper so I can pass days + list
    days: int
    results: List[SalespersonStat]
