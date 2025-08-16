from pydantic import BaseModel
from typing import List


class MonthCount(BaseModel):
    month: str
    count: int


class SourceCount(BaseModel):
    source: str
    count: int


class StatusCount(BaseModel):
    status: str
    count: int


class DashboardMetrics(BaseModel):
    leads_by_month: List[MonthCount]
    lead_sources: List[SourceCount]
    status_counts: List[StatusCount]
