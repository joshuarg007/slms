"""Chat Widget API routes - DeepSeek-powered AI chat for customer websites."""

import json
import logging
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.services.ai_chat import (
    chat_completion,
    extract_email_from_message,
    extract_name_from_message,
    extract_phone_from_message,
)

logger = logging.getLogger(__name__)


def generate_widget_key() -> str:
    """Generate a unique widget key."""
    return f"wgt_{secrets.token_urlsafe(16)}"


# ============================================================================
# Request/Response Models
# ============================================================================


BUBBLE_ICONS = ["chat", "message", "support", "robot", "sparkle", "wave"]


class ChatWidgetConfigRequest(BaseModel):
    """Request model for creating/updating chat widget configuration."""

    business_name: str = Field(..., min_length=1, max_length=255)
    business_description: str = Field(..., min_length=10, max_length=2000)
    services: str = Field(..., min_length=5, max_length=2000)
    restrictions: Optional[str] = Field(None, max_length=1000)
    cta: str = Field(default="Free 15-minute consultation", max_length=255)
    contact_email: str = Field(..., max_length=255)
    tone: str = Field(default="friendly")  # friendly, professional, casual
    extra_context: Optional[str] = Field(None, max_length=2000)
    primary_color: str = Field(default="#4f46e5", max_length=7)
    widget_position: str = Field(default="bottom-right")  # bottom-right, bottom-left
    bubble_icon: str = Field(default="chat")  # chat, message, support, robot, sparkle, wave
    is_active: bool = True


class ChatWidgetConfigResponse(BaseModel):
    """Response model for chat widget configuration."""

    id: int
    widget_key: str
    business_name: str
    business_description: str
    services: str
    restrictions: Optional[str]
    cta: str
    contact_email: str
    tone: str
    extra_context: Optional[str]
    primary_color: str
    widget_position: str
    bubble_icon: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class EmbedCodeResponse(BaseModel):
    """Response model containing embed code snippet."""

    embed_code: str
    widget_key: str


class ConversationSummary(BaseModel):
    """Summary of a chat widget conversation."""

    id: int
    session_id: str
    page_url: Optional[str]
    lead_email: Optional[str]
    lead_name: Optional[str]
    lead_phone: Optional[str]
    lead_captured_at: Optional[datetime]
    message_count: int
    created_at: datetime
    updated_at: datetime


class ConversationDetail(BaseModel):
    """Full conversation with transcript."""

    id: int
    session_id: str
    page_url: Optional[str]
    lead_email: Optional[str]
    lead_name: Optional[str]
    lead_phone: Optional[str]
    lead_captured_at: Optional[datetime]
    transcript: list[dict]  # Parsed JSON messages
    message_count: int
    total_tokens_input: int
    total_tokens_output: int
    created_at: datetime
    updated_at: datetime


# Public endpoint models
class PublicWidgetConfigResponse(BaseModel):
    """Public config for widget initialization (no sensitive data)."""

    business_name: str
    primary_color: str
    widget_position: str
    bubble_icon: str
    tone: str
    greeting: str  # Generated greeting message
    is_active: bool


class ChatMessageRequest(BaseModel):
    """Request to send a message to the chat widget."""

    session_id: str = Field(..., min_length=10, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)
    page_url: Optional[str] = Field(None, max_length=2048)


class ChatMessageResponse(BaseModel):
    """Response from the AI chat widget."""

    response: str
    lead_captured: bool = False
    captured_email: Optional[str] = None
    captured_phone: Optional[str] = None


# ============================================================================
# Authenticated Routes (Site2CRM Dashboard)
# ============================================================================

router = APIRouter(prefix="/chat-widget", tags=["Chat Widget"])


def _config_to_response(config: models.ChatWidgetConfig) -> ChatWidgetConfigResponse:
    """Helper to convert config model to response."""
    return ChatWidgetConfigResponse(
        id=config.id,
        widget_key=config.widget_key,
        business_name=config.business_name,
        business_description=config.business_description,
        services=config.services,
        restrictions=config.restrictions,
        cta=config.cta,
        contact_email=config.contact_email,
        tone=config.tone,
        extra_context=config.extra_context,
        primary_color=config.primary_color,
        widget_position=config.widget_position,
        bubble_icon=config.bubble_icon or "chat",
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("/configs", response_model=list[ChatWidgetConfigResponse])
def list_chat_widget_configs(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """List all chat widget configurations for the organization."""
    configs = (
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.organization_id == user.organization_id)
        .order_by(models.ChatWidgetConfig.created_at.desc())
        .all()
    )

    return [_config_to_response(c) for c in configs]


@router.get("/config", response_model=Optional[ChatWidgetConfigResponse])
def get_chat_widget_config(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get first chat widget configuration for the organization (legacy endpoint)."""
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.organization_id == user.organization_id)
        .first()
    )

    if not config:
        return None

    return _config_to_response(config)


@router.get("/config/{widget_key}", response_model=ChatWidgetConfigResponse)
def get_chat_widget_config_by_key(
    widget_key: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get a specific chat widget configuration by widget_key."""
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(
            models.ChatWidgetConfig.widget_key == widget_key,
            models.ChatWidgetConfig.organization_id == user.organization_id,
        )
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="Widget config not found")

    return _config_to_response(config)


def _validate_config_request(req: ChatWidgetConfigRequest):
    """Validate configuration request fields."""
    if req.tone not in models.CHAT_TONES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tone. Must be one of: {models.CHAT_TONES}",
        )

    if req.widget_position not in ["bottom-right", "bottom-left"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid widget_position. Must be 'bottom-right' or 'bottom-left'",
        )

    if not req.primary_color.startswith("#") or len(req.primary_color) != 7:
        raise HTTPException(
            status_code=400,
            detail="Invalid primary_color. Must be hex format (e.g., #4f46e5)",
        )

    if req.bubble_icon not in BUBBLE_ICONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bubble_icon. Must be one of: {BUBBLE_ICONS}",
        )


@router.post("/config", response_model=ChatWidgetConfigResponse)
def create_chat_widget_config(
    req: ChatWidgetConfigRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create a new chat widget configuration."""
    _validate_config_request(req)

    # Generate unique widget key
    widget_key = generate_widget_key()

    config = models.ChatWidgetConfig(
        organization_id=user.organization_id,
        widget_key=widget_key,
        business_name=req.business_name,
        business_description=req.business_description,
        services=req.services,
        restrictions=req.restrictions,
        cta=req.cta,
        contact_email=req.contact_email,
        tone=req.tone,
        extra_context=req.extra_context,
        primary_color=req.primary_color,
        widget_position=req.widget_position,
        bubble_icon=req.bubble_icon,
        is_active=req.is_active,
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    return _config_to_response(config)


@router.put("/config/{widget_key}", response_model=ChatWidgetConfigResponse)
def update_chat_widget_config(
    widget_key: str,
    req: ChatWidgetConfigRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update an existing chat widget configuration."""
    _validate_config_request(req)

    config = (
        db.query(models.ChatWidgetConfig)
        .filter(
            models.ChatWidgetConfig.widget_key == widget_key,
            models.ChatWidgetConfig.organization_id == user.organization_id,
        )
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="Widget config not found")

    config.business_name = req.business_name
    config.business_description = req.business_description
    config.services = req.services
    config.restrictions = req.restrictions
    config.cta = req.cta
    config.contact_email = req.contact_email
    config.tone = req.tone
    config.extra_context = req.extra_context
    config.primary_color = req.primary_color
    config.widget_position = req.widget_position
    config.bubble_icon = req.bubble_icon
    config.is_active = req.is_active
    config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(config)

    return _config_to_response(config)


@router.delete("/config/{widget_key}")
def delete_chat_widget_config(
    widget_key: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Delete a chat widget configuration."""
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(
            models.ChatWidgetConfig.widget_key == widget_key,
            models.ChatWidgetConfig.organization_id == user.organization_id,
        )
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="Widget config not found")

    db.delete(config)
    db.commit()

    return {"message": "Widget configuration deleted"}


@router.get("/embed-code/{widget_key}", response_model=EmbedCodeResponse)
def get_embed_code(
    widget_key: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get the embed code snippet for a specific chat widget."""
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(
            models.ChatWidgetConfig.widget_key == widget_key,
            models.ChatWidgetConfig.organization_id == user.organization_id,
        )
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="Widget config not found")

    # Generate embed code using widget_key
    embed_code = f"""<!-- Site2CRM AI Chat Widget -->
<script
  src="https://api.site2crm.io/api/public/chat-widget/widget.js"
  data-widget-key="{widget_key}"
  async
></script>"""

    return EmbedCodeResponse(embed_code=embed_code, widget_key=widget_key)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    widget_key: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    lead_only: bool = False,
):
    """List chat widget conversations for the organization (optionally filtered by widget_key)."""
    # Build query based on whether widget_key is provided
    if widget_key:
        config = (
            db.query(models.ChatWidgetConfig)
            .filter(
                models.ChatWidgetConfig.widget_key == widget_key,
                models.ChatWidgetConfig.organization_id == user.organization_id,
            )
            .first()
        )
        if not config:
            return []
        config_ids = [config.id]
    else:
        # Get all configs for the organization
        configs = (
            db.query(models.ChatWidgetConfig)
            .filter(models.ChatWidgetConfig.organization_id == user.organization_id)
            .all()
        )
        if not configs:
            return []
        config_ids = [c.id for c in configs]

    query = db.query(models.ChatWidgetConversation).filter(
        models.ChatWidgetConversation.config_id.in_(config_ids)
    )

    if lead_only:
        query = query.filter(models.ChatWidgetConversation.lead_email.isnot(None))

    conversations = (
        query.order_by(models.ChatWidgetConversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        ConversationSummary(
            id=conv.id,
            session_id=conv.session_id,
            page_url=conv.page_url,
            lead_email=conv.lead_email,
            lead_name=conv.lead_name,
            lead_phone=conv.lead_phone,
            lead_captured_at=conv.lead_captured_at,
            message_count=conv.message_count,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )
        for conv in conversations
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get a specific conversation with full transcript."""
    # Get all config IDs for this org
    config_ids = [
        c.id for c in
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.organization_id == user.organization_id)
        .all()
    ]
    if not config_ids:
        raise HTTPException(status_code=404, detail="No chat widgets configured")

    conversation = (
        db.query(models.ChatWidgetConversation)
        .filter(
            models.ChatWidgetConversation.id == conversation_id,
            models.ChatWidgetConversation.config_id.in_(config_ids),
        )
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Parse transcript JSON
    try:
        transcript = json.loads(conversation.transcript) if conversation.transcript else []
    except json.JSONDecodeError:
        transcript = []

    return ConversationDetail(
        id=conversation.id,
        session_id=conversation.session_id,
        page_url=conversation.page_url,
        lead_email=conversation.lead_email,
        lead_name=conversation.lead_name,
        lead_phone=conversation.lead_phone,
        lead_captured_at=conversation.lead_captured_at,
        transcript=transcript,
        message_count=conversation.message_count,
        total_tokens_input=conversation.total_tokens_input,
        total_tokens_output=conversation.total_tokens_output,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Delete a conversation."""
    # Get all config IDs for this org
    config_ids = [
        c.id for c in
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.organization_id == user.organization_id)
        .all()
    ]
    if not config_ids:
        raise HTTPException(status_code=404, detail="No chat widgets configured")

    conversation = (
        db.query(models.ChatWidgetConversation)
        .filter(
            models.ChatWidgetConversation.id == conversation_id,
            models.ChatWidgetConversation.config_id.in_(config_ids),
        )
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted"}


# ============================================================================
# Lead Creation Helper
# ============================================================================


def create_lead_from_conversation(
    db: Session,
    config: models.ChatWidgetConfig,
    conversation: models.ChatWidgetConversation,
) -> Optional[models.Lead]:
    """Create a Lead record from chat widget conversation data.

    Creates a lead when we have:
    - email + name, OR
    - phone + name (uses placeholder email since Lead.email is required)

    Returns the created Lead or None if requirements not met.
    """
    email = conversation.lead_email
    name = conversation.lead_name
    phone = conversation.lead_phone

    # Check if we have enough info to create a lead
    has_email_and_name = email and name
    has_phone_and_name = phone and name

    if not (has_email_and_name or has_phone_and_name):
        return None

    # Check if lead already exists for this conversation
    # (by checking if a lead with same email/phone exists for this org)
    if email:
        existing = (
            db.query(models.Lead)
            .filter(
                models.Lead.organization_id == config.organization_id,
                models.Lead.email == email,
            )
            .first()
        )
        if existing:
            # Update existing lead with any new info
            if phone and not existing.phone:
                existing.phone = phone
                db.commit()
            return existing

    # For phone-only leads, check if lead with same phone already exists
    if phone and not email:
        existing = (
            db.query(models.Lead)
            .filter(
                models.Lead.organization_id == config.organization_id,
                models.Lead.phone == phone,
            )
            .first()
        )
        if existing:
            return existing

    # For phone-only leads, use a placeholder email
    lead_email = email if email else f"chatwidget-{conversation.session_id[:20]}@noemail.site2crm.io"

    # Parse name into first/last
    first_name = None
    last_name = None
    if name:
        parts = name.split(None, 1)
        first_name = parts[0] if parts else None
        last_name = parts[1] if len(parts) > 1 else None

    lead = models.Lead(
        organization_id=config.organization_id,
        name=name,
        first_name=first_name,
        last_name=last_name,
        email=lead_email,
        phone=phone,
        source="chat_widget",
        landing_page_url=conversation.page_url,
        notes=f"Captured via AI chat widget ({config.business_name})",
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    logger.info(
        f"Created lead {lead.id} from chat widget conversation {conversation.id} "
        f"(org={config.organization_id})"
    )

    return lead


# ============================================================================
# Public Routes (Widget on Customer Websites)
# ============================================================================

public_router = APIRouter(prefix="/public/chat-widget", tags=["Public Chat Widget"])


@public_router.get("/config/{widget_key}", response_model=PublicWidgetConfigResponse)
def get_public_widget_config(
    widget_key: str,
    db: Session = Depends(get_db),
):
    """Get public widget configuration (for widget initialization)."""
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.widget_key == widget_key)
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Chat widget not found")

    if not config.is_active:
        raise HTTPException(status_code=404, detail="Chat widget is disabled")

    # Generate greeting based on tone
    greetings = {
        "friendly": f"Hi there! 👋 I'm the AI assistant for {config.business_name}. How can I help you today?",
        "professional": f"Welcome to {config.business_name}. How may I assist you?",
        "casual": f"Hey! What can I help you with today?",
    }
    greeting = greetings.get(config.tone, greetings["friendly"])

    return PublicWidgetConfigResponse(
        business_name=config.business_name,
        primary_color=config.primary_color,
        widget_position=config.widget_position,
        bubble_icon=config.bubble_icon or "chat",
        tone=config.tone,
        greeting=greeting,
        is_active=config.is_active,
    )


@public_router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    widget_key: str,
    req: ChatMessageRequest,
    db: Session = Depends(get_db),
):
    """Send a message and get an AI response."""
    # Look up widget config by widget_key
    config = (
        db.query(models.ChatWidgetConfig)
        .filter(models.ChatWidgetConfig.widget_key == widget_key)
        .first()
    )
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="Chat widget not available")

    # Get or create conversation
    conversation = (
        db.query(models.ChatWidgetConversation)
        .filter(
            models.ChatWidgetConversation.config_id == config.id,
            models.ChatWidgetConversation.session_id == req.session_id,
        )
        .first()
    )

    if not conversation:
        conversation = models.ChatWidgetConversation(
            config_id=config.id,
            session_id=req.session_id,
            page_url=req.page_url,
            transcript="[]",
            message_count=0,
            total_tokens_input=0,
            total_tokens_output=0,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Parse existing transcript
    try:
        transcript = json.loads(conversation.transcript) if conversation.transcript else []
    except json.JSONDecodeError:
        transcript = []

    # Add user message to transcript
    transcript.append({"role": "user", "content": req.message})

    # Build messages for API (system prompt is built inside chat_completion)
    api_messages = [{"role": m["role"], "content": m["content"]} for m in transcript]

    # Call DeepSeek
    try:
        response_text, input_tokens, output_tokens = await chat_completion(
            config=config,
            messages=api_messages,
            max_tokens=256,
        )
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")

    # Add assistant response to transcript
    transcript.append({"role": "assistant", "content": response_text})

    # Check for lead capture in user message
    captured_email = None
    captured_phone = None
    lead_captured = False

    email = extract_email_from_message(req.message)
    phone = extract_phone_from_message(req.message)
    name = extract_name_from_message(req.message)

    if email and not conversation.lead_email:
        conversation.lead_email = email
        conversation.lead_captured_at = datetime.utcnow()
        captured_email = email
        lead_captured = True

    if phone and not conversation.lead_phone:
        conversation.lead_phone = phone
        captured_phone = phone
        if not lead_captured:
            conversation.lead_captured_at = datetime.utcnow()
            lead_captured = True

    if name and not conversation.lead_name:
        conversation.lead_name = name

    # Update conversation
    conversation.transcript = json.dumps(transcript)
    conversation.message_count = len([m for m in transcript if m["role"] == "user"])
    conversation.total_tokens_input += input_tokens
    conversation.total_tokens_output += output_tokens
    conversation.updated_at = datetime.utcnow()

    # Update page_url if not set
    if not conversation.page_url and req.page_url:
        conversation.page_url = req.page_url

    db.commit()

    # Create a Lead record if we have enough info (email+name OR phone+name)
    # Only attempt if we just captured new contact info
    if lead_captured or name:
        try:
            create_lead_from_conversation(db, config, conversation)
        except Exception as e:
            # Log but don't fail the chat - lead creation is secondary
            logger.error(f"Failed to create lead from conversation: {e}")

    return ChatMessageResponse(
        response=response_text,
        lead_captured=lead_captured,
        captured_email=captured_email,
        captured_phone=captured_phone,
    )


@public_router.get("/widget.js")
def get_widget_js():
    """Serve the embeddable chat widget JavaScript bundle."""
    widget_path = Path(__file__).parent.parent.parent.parent / "widget" / "chat-widget" / "dist" / "chat-widget.min.js"

    if not widget_path.exists():
        # Return placeholder if widget not built
        placeholder = """
(function() {
  console.warn('Site2CRM Chat Widget: Bundle not built yet.');
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:20px;background:#f0f0f0;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui;z-index:9999;';
  container.innerHTML = '<strong>Chat Widget</strong><br><small>Build required</small>';
  document.body.appendChild(container);
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
