"""Pydantic schemas for form configuration."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class FieldConfig(BaseModel):
    """Configuration for a single form field."""

    key: str = Field(..., description="Field identifier (name, email, phone, company, or custom_X)")
    enabled: bool = True
    required: bool = False
    label: str = Field(..., description="Display label for the field")
    placeholder: Optional[str] = None
    field_type: Literal["text", "email", "tel", "textarea", "select", "multi"] = "text"
    options: Optional[List[str]] = Field(None, description="Options for select/multi fields")


class StylingConfig(BaseModel):
    """Visual styling options."""

    primaryColor: str = "#2563eb"
    borderRadius: str = "10px"
    fontFamily: str = "system-ui"


class WizardConfig(BaseModel):
    """Multi-step wizard specific options."""

    showProgressBar: bool = True
    showSummary: bool = True
    animationDuration: int = Field(300, ge=0, le=1000)


class ModalConfig(BaseModel):
    """Modal popup specific options."""

    triggerButtonText: str = "Contact Us"
    triggerPosition: Literal["bottom-right", "bottom-left", "center"] = "bottom-right"


class DrawerConfig(BaseModel):
    """Slide-in drawer specific options."""

    position: Literal["left", "right"] = "right"
    triggerButtonText: str = "Get in Touch"


class BrandingConfig(BaseModel):
    """Branding and copy options."""

    showPoweredBy: bool = True
    headerText: str = "Contact Us"
    subheaderText: str = "Fill out the form below"
    submitButtonText: str = "Submit"
    successMessage: str = "Thanks! We'll be in touch."


# Default fields configuration
DEFAULT_FIELDS: List[FieldConfig] = [
    FieldConfig(key="name", enabled=True, required=False, label="Full Name", placeholder="Ada Lovelace", field_type="text"),
    FieldConfig(key="email", enabled=True, required=True, label="Email", placeholder="you@domain.com", field_type="email"),
    FieldConfig(key="phone", enabled=True, required=False, label="Phone", placeholder="+1 555 555 5555", field_type="tel"),
    FieldConfig(key="company", enabled=True, required=False, label="Company", placeholder="Acme Inc.", field_type="text"),
]


class FormConfigIn(BaseModel):
    """Input schema for creating/updating form config."""

    form_style: Literal["inline", "wizard", "modal", "drawer"] = "inline"
    fields: List[FieldConfig] = Field(default_factory=lambda: DEFAULT_FIELDS.copy())
    styling: Optional[StylingConfig] = None
    wizard: Optional[WizardConfig] = None
    modal: Optional[ModalConfig] = None
    drawer: Optional[DrawerConfig] = None
    branding: Optional[BrandingConfig] = None


class FormConfigOut(BaseModel):
    """Output schema for form config responses."""

    id: int
    organization_id: int
    form_style: str
    fields: List[FieldConfig]
    styling: StylingConfig
    wizard: WizardConfig
    modal: ModalConfig
    drawer: DrawerConfig
    branding: BrandingConfig
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmbedCodeOut(BaseModel):
    """Embed code snippets for the form widget."""

    script_tag: str
    iframe_tag: str
    org_key: str
