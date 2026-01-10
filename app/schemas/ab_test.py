"""Pydantic schemas for A/B testing."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class FormVariantCreate(BaseModel):
    """Create a form variant."""
    name: str = Field(..., min_length=1, max_length=50)
    is_control: bool = False
    weight: int = Field(50, ge=0, le=100)
    config_overrides: dict = Field(default_factory=dict)


class FormVariantUpdate(BaseModel):
    """Update a form variant."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    weight: Optional[int] = Field(None, ge=0, le=100)
    config_overrides: Optional[dict] = None


class FormVariantOut(BaseModel):
    """Form variant response."""
    id: int
    ab_test_id: int
    name: str
    is_control: bool
    weight: int
    config_overrides: dict
    impressions: int
    conversions: int
    conversion_rate: float  # Computed field
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ABTestCreate(BaseModel):
    """Create an A/B test."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    goal_type: Literal["conversions"] = "conversions"
    variants: List[FormVariantCreate] = Field(default_factory=list)


class ABTestUpdate(BaseModel):
    """Update an A/B test."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    status: Optional[Literal["draft", "running", "paused", "completed"]] = None


class ABTestOut(BaseModel):
    """A/B test response."""
    id: int
    organization_id: int
    name: str
    description: Optional[str]
    status: str
    goal_type: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    variants: List[FormVariantOut]
    # Summary stats
    total_impressions: int
    total_conversions: int
    overall_conversion_rate: float

    class Config:
        from_attributes = True


class ABTestListItem(BaseModel):
    """Simplified A/B test for list views."""
    id: int
    name: str
    status: str
    variants_count: int
    total_impressions: int
    total_conversions: int
    conversion_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class ABTestResultsOut(BaseModel):
    """Detailed results for an A/B test."""
    test: ABTestOut
    winner: Optional[FormVariantOut]  # Variant with best conversion rate
    statistical_significance: Optional[float]  # 0-100%, None if not enough data
    recommendation: str  # e.g., "Continue testing", "Variant A is winner"
