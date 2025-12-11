# app/api/routes/chat.py
"""AI Chat API routes for Site2CRM."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.plans import get_plan_limits, get_ai_message_limit
from app.db import models
from app.db.session import SessionLocal
from app.services.ai_consultant import (
    ai_consultant,
    AIConsultantError,
    AIQuotaExceededError,
    AIFeatureNotAllowedError,
)

router = APIRouter(prefix="/chat", tags=["AI Chat"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Request/Response Models ---

class LastMessage(BaseModel):
    role: str
    content: str


class SendMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    context_type: str = "general"  # general, lead_analysis, coaching
    context_id: Optional[int] = None  # e.g., lead_id for lead_analysis
    wmem_context: Optional[str] = None  # WMEM memory block
    last_messages: Optional[list[LastMessage]] = None  # Last 2 messages only


class SendMessageResponse(BaseModel):
    conversation_id: int
    message_id: int
    response: str
    tokens_used: int
    updated_wmem: Optional[str] = None  # Updated WMEM to save client-side


class ConversationSummary(BaseModel):
    id: int
    title: Optional[str]
    context_type: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class ConversationDetailResponse(BaseModel):
    id: int
    title: Optional[str]
    context_type: str
    context_id: Optional[int]
    messages: list[MessageResponse]
    created_at: datetime


class AIUsageResponse(BaseModel):
    messages_used: int
    messages_limit: int  # -1 for unlimited
    messages_remaining: int  # -1 for unlimited
    reset_date: Optional[datetime]
    ai_enabled: bool
    ai_features: list[str]


# --- Helper Functions ---

def check_and_increment_usage(db: Session, org: models.Organization) -> None:
    """Check AI quota and increment usage counter."""
    limit = get_ai_message_limit(org.plan)

    # Check if disabled
    if limit == 0:
        raise HTTPException(
            status_code=403,
            detail="AI features are not available on your current plan. Please upgrade to Pro or higher."
        )

    # Check if quota exceeded (skip for unlimited)
    if limit != -1:
        # Reset counter if new month
        now = datetime.utcnow()
        if org.ai_messages_month_reset is None or org.ai_messages_month_reset < now:
            org.ai_messages_this_month = 0
            # Set reset to first day of next month
            if now.month == 12:
                org.ai_messages_month_reset = datetime(now.year + 1, 1, 1)
            else:
                org.ai_messages_month_reset = datetime(now.year, now.month + 1, 1)

        if org.ai_messages_this_month >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"AI message quota exceeded. You've used {org.ai_messages_this_month}/{limit} messages this month."
            )

    # Increment usage
    org.ai_messages_this_month += 1
    db.commit()


def get_lead_context(db: Session, lead_id: int, org_id: int) -> Optional[dict]:
    """Fetch lead data for context injection."""
    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.organization_id == org_id
    ).first()

    if not lead:
        return None

    return {
        "name": lead.name,
        "email": lead.email,
        "company": lead.company,
        "phone": lead.phone,
        "source": lead.source,
        "notes": lead.notes,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


# --- API Endpoints ---

@router.post("/messages", response_model=SendMessageResponse)
async def send_message(
    req: SendMessageRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Send a message to the AI consultant and get a response."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Validate feature access
    if not ai_consultant.validate_feature(org.plan, req.context_type):
        raise HTTPException(
            status_code=403,
            detail=f"The '{req.context_type}' feature is not available on your current plan."
        )

    # Check and increment quota
    check_and_increment_usage(db, org)

    # Get or create conversation
    conversation = None
    if req.conversation_id:
        conversation = db.query(models.ChatConversation).filter(
            models.ChatConversation.id == req.conversation_id,
            models.ChatConversation.organization_id == org.id,
            models.ChatConversation.user_id == user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation
        conversation = models.ChatConversation(
            organization_id=org.id,
            user_id=user.id,
            context_type=req.context_type,
            context_id=req.context_id,
            title=ai_consultant.generate_title(req.message),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Build context data
    context_data = None
    if req.context_type == "lead_analysis" and req.context_id:
        lead_data = get_lead_context(db, req.context_id, org.id)
        if lead_data:
            context_data = ai_consultant.build_context_string(
                req.context_type,
                lead_data=lead_data,
            )

    # Use WMEM + last_messages if provided (cost-efficient mode)
    # Otherwise fall back to full DB history
    if req.wmem_context or req.last_messages:
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in (req.last_messages or [])
        ]
    else:
        # Fallback: Get conversation history from DB
        history_messages = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == conversation.id
        ).order_by(models.ChatMessage.created_at).all()
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in history_messages
        ]

    # Call AI service
    try:
        response_text, input_tokens, output_tokens = await ai_consultant.chat(
            message=req.message,
            conversation_history=conversation_history,
            context_type=req.context_type,
            context_data=context_data,
            wmem_context=req.wmem_context,
        )
    except AIConsultantError as e:
        # Decrement usage on error
        org.ai_messages_this_month = max(0, org.ai_messages_this_month - 1)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    # Save user message
    user_message = models.ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=req.message,
        tokens_input=0,
        tokens_output=0,
    )
    db.add(user_message)

    # Save assistant message
    assistant_message = models.ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
        tokens_input=input_tokens,
        tokens_output=output_tokens,
    )
    db.add(assistant_message)

    # Update conversation timestamp
    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(assistant_message)

    # Extract updated WMEM from response
    updated_wmem = ai_consultant.extract_wmem(response_text)

    return SendMessageResponse(
        conversation_id=conversation.id,
        message_id=assistant_message.id,
        response=response_text,
        tokens_used=input_tokens + output_tokens,
        updated_wmem=updated_wmem,
    )


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """List user's chat conversations."""
    conversations = db.query(models.ChatConversation).filter(
        models.ChatConversation.organization_id == user.organization_id,
        models.ChatConversation.user_id == user.id,
    ).order_by(
        models.ChatConversation.updated_at.desc()
    ).offset(offset).limit(limit).all()

    results = []
    for conv in conversations:
        message_count = db.query(models.ChatMessage).filter(
            models.ChatMessage.conversation_id == conv.id
        ).count()

        results.append(ConversationSummary(
            id=conv.id,
            title=conv.title,
            context_type=conv.context_type,
            message_count=message_count,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ))

    return results


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get a specific conversation with all messages."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.organization_id == user.organization_id,
        models.ChatConversation.user_id == user.id,
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.conversation_id == conversation.id
    ).order_by(models.ChatMessage.created_at).all()

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        context_type=conversation.context_type,
        context_id=conversation.context_id,
        messages=[
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        created_at=conversation.created_at,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Delete a conversation and all its messages."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.organization_id == user.organization_id,
        models.ChatConversation.user_id == user.id,
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted"}


@router.get("/usage", response_model=AIUsageResponse)
def get_ai_usage(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Get AI usage statistics for the organization."""
    org = db.get(models.Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    limits = get_plan_limits(org.plan)
    message_limit = limits.ai_messages_per_month
    messages_used = org.ai_messages_this_month

    # Calculate remaining
    if message_limit == -1:
        messages_remaining = -1
    elif message_limit == 0:
        messages_remaining = 0
    else:
        messages_remaining = max(0, message_limit - messages_used)

    return AIUsageResponse(
        messages_used=messages_used,
        messages_limit=message_limit,
        messages_remaining=messages_remaining,
        reset_date=org.ai_messages_month_reset,
        ai_enabled=message_limit != 0,
        ai_features=limits.ai_features,
    )
