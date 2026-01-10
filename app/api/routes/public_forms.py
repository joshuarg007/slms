"""Public API routes for form widget (no auth required)."""

import json
import random
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db import models
from app.api.deps.auth import get_db
from app.schemas.form import (
    FieldConfig,
    StylingConfig,
    WizardConfig,
    ModalConfig,
    DrawerConfig,
    BrandingConfig,
    DEFAULT_FIELDS,
)

router = APIRouter(prefix="/public/forms", tags=["Public Forms"])


def select_variant(variants: list[models.FormVariant]) -> Optional[models.FormVariant]:
    """Select a variant based on weights (weighted random)."""
    if not variants:
        return None

    total_weight = sum(v.weight for v in variants)
    if total_weight <= 0:
        return variants[0]  # Fallback to first

    rand = random.randint(1, total_weight)
    cumulative = 0
    for v in variants:
        cumulative += v.weight
        if rand <= cumulative:
            return v

    return variants[-1]  # Fallback


def deep_merge(base: dict, overrides: dict) -> dict:
    """Deep merge overrides into base config."""
    result = base.copy()
    for key, value in overrides.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def parse_config_json(config_json: str) -> dict:
    """Parse config JSON string to dict."""
    try:
        return json.loads(config_json) if config_json else {}
    except json.JSONDecodeError:
        return {}


@router.get("/config/{org_key}")
def get_public_form_config(
    org_key: str,
    db: Session = Depends(get_db),
):
    """Get form configuration for embedding (public, keyed by org API key)."""
    # Look up organization by API key
    org = (
        db.query(models.Organization)
        .filter(models.Organization.api_key == org_key)
        .first()
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get form config
    config = (
        db.query(models.FormConfig)
        .filter(models.FormConfig.organization_id == org.id)
        .first()
    )

    # Build base config
    if not config:
        base_config = {
            "form_style": "inline",
            "fields": [f.model_dump() for f in DEFAULT_FIELDS],
            "styling": StylingConfig().model_dump(),
            "wizard": WizardConfig().model_dump(),
            "modal": ModalConfig().model_dump(),
            "drawer": DrawerConfig().model_dump(),
            "branding": BrandingConfig().model_dump(),
        }
    else:
        data = parse_config_json(config.config_json)
        fields_data = data.get("fields", [])
        if fields_data:
            fields = fields_data
        else:
            fields = [f.model_dump() for f in DEFAULT_FIELDS]

        base_config = {
            "form_style": config.form_style,
            "fields": fields,
            "styling": data.get("styling") or StylingConfig().model_dump(),
            "wizard": data.get("wizard") or WizardConfig().model_dump(),
            "modal": data.get("modal") or ModalConfig().model_dump(),
            "drawer": data.get("drawer") or DrawerConfig().model_dump(),
            "branding": data.get("branding") or BrandingConfig().model_dump(),
        }

    # Check for running A/B test
    variant_id = None
    running_test = (
        db.query(models.ABTest)
        .filter(
            models.ABTest.organization_id == org.id,
            models.ABTest.status == models.AB_TEST_STATUS_RUNNING,
        )
        .first()
    )

    if running_test and running_test.variants:
        # Select a variant based on weights
        selected = select_variant(running_test.variants)
        if selected:
            variant_id = selected.id

            # Track impression
            selected.impressions += 1
            db.commit()

            # Apply variant config overrides
            try:
                overrides = json.loads(selected.config_overrides) if selected.config_overrides else {}
                if overrides:
                    base_config = deep_merge(base_config, overrides)
            except json.JSONDecodeError:
                pass

    # Include variant_id so widget can pass it with lead submission
    base_config["variant_id"] = variant_id
    return base_config


@router.get("/widget.js")
def get_widget_js():
    """Serve the embeddable widget JavaScript bundle."""
    # Path to the built widget bundle
    widget_path = Path(__file__).parent.parent.parent.parent / "widget" / "dist" / "widget.min.js"

    if not widget_path.exists():
        # Return a placeholder script if widget not built yet
        placeholder = """
(function() {
  console.warn('SLMS Widget: Bundle not built yet. Run "npm run build" in /widget directory.');
  var container = document.querySelector('[data-container]') || document.getElementById('slms-form');
  if (container) {
    container.innerHTML = '<div style="padding:20px;border:1px dashed #ccc;border-radius:8px;text-align:center;color:#666;">Widget loading... (build required)</div>';
  }
})();
"""
        return Response(
            content=placeholder,
            media_type="application/javascript",
            headers={"Cache-Control": "no-cache"},
        )

    return FileResponse(
        widget_path,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/iframe")
def get_widget_iframe(
    key: str,
    db: Session = Depends(get_db),
):
    """Serve an HTML page for iframe embedding."""
    # Verify org key exists
    org = (
        db.query(models.Organization)
        .filter(models.Organization.api_key == key)
        .first()
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Return a self-contained HTML page that loads the widget
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: system-ui, -apple-system, sans-serif; }}
  </style>
</head>
<body>
  <div id="slms-form"></div>
  <script
    src="/api/public/forms/widget.js"
    data-org-key="{key}"
    data-container="slms-form"
  ></script>
</body>
</html>"""

    return Response(
        content=html,
        media_type="text/html",
    )
