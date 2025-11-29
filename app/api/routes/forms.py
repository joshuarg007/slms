"""API routes for form configuration (authenticated)."""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.api.deps.auth import get_db, get_current_user
from app.core.config import settings
from app.schemas.form import (
    FormConfigIn,
    FormConfigOut,
    EmbedCodeOut,
    FieldConfig,
    StylingConfig,
    WizardConfig,
    ModalConfig,
    DrawerConfig,
    BrandingConfig,
    DEFAULT_FIELDS,
)

router = APIRouter(prefix="/forms", tags=["Forms"])


def parse_config_json(config_json: str) -> dict:
    """Parse config JSON string to dict, with defaults."""
    try:
        return json.loads(config_json) if config_json else {}
    except json.JSONDecodeError:
        return {}


def build_form_config_out(config: models.FormConfig) -> FormConfigOut:
    """Convert DB model to response schema with defaults."""
    data = parse_config_json(config.config_json)

    # Parse fields or use defaults
    fields_data = data.get("fields", [])
    if fields_data:
        fields = [FieldConfig(**f) for f in fields_data]
    else:
        fields = DEFAULT_FIELDS.copy()

    return FormConfigOut(
        id=config.id,
        organization_id=config.organization_id,
        form_style=config.form_style,
        fields=fields,
        styling=StylingConfig(**(data.get("styling") or {})),
        wizard=WizardConfig(**(data.get("wizard") or {})),
        modal=ModalConfig(**(data.get("modal") or {})),
        drawer=DrawerConfig(**(data.get("drawer") or {})),
        branding=BrandingConfig(**(data.get("branding") or {})),
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("/config", response_model=FormConfigOut)
def get_form_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get the form configuration for the current organization."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    config = (
        db.query(models.FormConfig)
        .filter(models.FormConfig.organization_id == org_id)
        .first()
    )

    if not config:
        # Return default config if none exists
        now = datetime.utcnow()
        return FormConfigOut(
            id=0,
            organization_id=org_id,
            form_style="inline",
            fields=DEFAULT_FIELDS.copy(),
            styling=StylingConfig(),
            wizard=WizardConfig(),
            modal=ModalConfig(),
            drawer=DrawerConfig(),
            branding=BrandingConfig(),
            created_at=now,
            updated_at=now,
        )

    return build_form_config_out(config)


@router.put("/config", response_model=FormConfigOut)
def update_form_config(
    payload: FormConfigIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create or update form configuration for the current organization."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Build config JSON
    config_data = {
        "fields": [f.model_dump() for f in payload.fields],
        "styling": payload.styling.model_dump() if payload.styling else StylingConfig().model_dump(),
        "wizard": payload.wizard.model_dump() if payload.wizard else WizardConfig().model_dump(),
        "modal": payload.modal.model_dump() if payload.modal else ModalConfig().model_dump(),
        "drawer": payload.drawer.model_dump() if payload.drawer else DrawerConfig().model_dump(),
        "branding": payload.branding.model_dump() if payload.branding else BrandingConfig().model_dump(),
    }

    config = (
        db.query(models.FormConfig)
        .filter(models.FormConfig.organization_id == org_id)
        .first()
    )

    now = datetime.utcnow()

    if config:
        # Update existing
        config.form_style = payload.form_style
        config.config_json = json.dumps(config_data)
        config.updated_at = now
    else:
        # Create new
        config = models.FormConfig(
            organization_id=org_id,
            form_style=payload.form_style,
            config_json=json.dumps(config_data),
            created_at=now,
            updated_at=now,
        )
        db.add(config)

    db.commit()
    db.refresh(config)

    return build_form_config_out(config)


@router.get("/embed-code", response_model=EmbedCodeOut)
def get_embed_code(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate embed code snippets for the form widget."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organization")

    # Get org to retrieve API key
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org or not org.api_key:
        raise HTTPException(status_code=400, detail="Organization API key not configured")

    # Base URL for the widget - configurable via API_BASE_URL env var
    base_url = settings.api_base_url

    # Simple one-liner for easy copy-paste
    script_tag = f'''<!-- Site2CRM Form - Paste this where you want the form to appear -->
<div id="s2c-form"></div>
<script src="{base_url}/api/public/forms/widget.js" data-org-key="{org.api_key}" data-container="s2c-form"></script>'''

    iframe_tag = f'''<!-- Site2CRM Form (iframe) - Paste this where you want the form to appear -->
<iframe src="{base_url}/api/public/forms/iframe?key={org.api_key}" style="border:none; width:100%; min-height:500px;" title="Contact Form"></iframe>'''

    return EmbedCodeOut(
        script_tag=script_tag,
        iframe_tag=iframe_tag,
        org_key=org.api_key,
    )
