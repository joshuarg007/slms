# app/services/ai_consultant.py
"""AI Lead Consultant service for Site2CRM."""

from datetime import datetime
from typing import Optional

import anthropic

from app.core.config import settings
from app.core.plans import (
    get_ai_message_limit,
    is_ai_enabled,
    is_ai_feature_allowed,
    AI_FEATURE_ANALYSIS,
    AI_FEATURE_COACHING,
    AI_FEATURE_REPORTS,
)


SYSTEM_PROMPT = """You are a Lead Consultant AI for Site2CRM, a lead management and CRM platform. Your role is to help sales teams maximize their effectiveness.

Your capabilities:
- Analyze lead quality and help prioritize follow-ups
- Provide actionable sales coaching and techniques
- Generate insights from CRM and lead data
- Suggest next best actions for leads
- Help interpret salesperson performance metrics

Guidelines:
- Be concise and actionable - sales teams are busy
- Reference specific data and metrics when available
- Focus on practical, implementable advice
- When analyzing leads, consider factors like engagement, company size, and timing
- For coaching, provide specific talk tracks or email templates when helpful

You have access to the user's lead data and CRM statistics when they provide context. Use this data to give personalized recommendations."""

CONTEXT_PROMPTS = {
    "general": "",
    "lead_analysis": """The user wants to analyze lead data. Focus on:
- Lead quality assessment
- Conversion likelihood
- Recommended next actions
- Timing suggestions for follow-up""",
    "coaching": """The user wants sales coaching. Focus on:
- Specific techniques and strategies
- Email/call scripts when helpful
- Common objection handling
- Performance improvement tips""",
}


class AIConsultantError(Exception):
    """Base exception for AI consultant errors."""
    pass


class AIQuotaExceededError(AIConsultantError):
    """Raised when AI message quota is exceeded."""
    pass


class AIFeatureNotAllowedError(AIConsultantError):
    """Raised when AI feature is not allowed for plan."""
    pass


class AIConsultant:
    """AI Lead Consultant service."""

    def __init__(self):
        self.client = None
        if settings.anthropic_api_key:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def _ensure_client(self):
        """Ensure the Anthropic client is initialized."""
        if not self.client:
            raise AIConsultantError("AI service not configured. Please set ANTHROPIC_API_KEY.")

    def check_quota(self, plan: str, current_usage: int) -> bool:
        """Check if user has remaining AI quota."""
        limit = get_ai_message_limit(plan)
        if limit == -1:  # Unlimited
            return True
        if limit == 0:  # Disabled
            return False
        return current_usage < limit

    def validate_feature(self, plan: str, context_type: str) -> bool:
        """Validate if the context type/feature is allowed for the plan."""
        if not is_ai_enabled(plan):
            return False

        # Map context types to features
        feature_map = {
            "general": AI_FEATURE_ANALYSIS,
            "lead_analysis": AI_FEATURE_ANALYSIS,
            "coaching": AI_FEATURE_COACHING,
            "reports": AI_FEATURE_REPORTS,
        }

        required_feature = feature_map.get(context_type, AI_FEATURE_ANALYSIS)
        return is_ai_feature_allowed(plan, required_feature)

    def build_context_string(
        self,
        context_type: str,
        lead_data: Optional[dict] = None,
        crm_stats: Optional[dict] = None,
        salesperson_stats: Optional[dict] = None,
    ) -> str:
        """Build context string to inject into the conversation."""
        parts = []

        # Add context-specific prompt
        if context_type in CONTEXT_PROMPTS:
            parts.append(CONTEXT_PROMPTS[context_type])

        # Add lead data if provided
        if lead_data:
            parts.append(f"\n--- Lead Data ---\n{self._format_lead_data(lead_data)}")

        # Add CRM stats if provided
        if crm_stats:
            parts.append(f"\n--- CRM Statistics ---\n{self._format_crm_stats(crm_stats)}")

        # Add salesperson stats if provided
        if salesperson_stats:
            parts.append(f"\n--- Salesperson Performance ---\n{self._format_salesperson_stats(salesperson_stats)}")

        return "\n".join(parts)

    def _format_lead_data(self, lead: dict) -> str:
        """Format lead data for context injection."""
        lines = []
        if lead.get("name"):
            lines.append(f"Name: {lead['name']}")
        if lead.get("email"):
            lines.append(f"Email: {lead['email']}")
        if lead.get("company"):
            lines.append(f"Company: {lead['company']}")
        if lead.get("phone"):
            lines.append(f"Phone: {lead['phone']}")
        if lead.get("source"):
            lines.append(f"Source: {lead['source']}")
        if lead.get("notes"):
            lines.append(f"Notes: {lead['notes']}")
        if lead.get("created_at"):
            lines.append(f"Created: {lead['created_at']}")
        return "\n".join(lines) if lines else "No lead data available"

    def _format_crm_stats(self, stats: dict) -> str:
        """Format CRM stats for context injection."""
        lines = []
        if stats.get("total_leads"):
            lines.append(f"Total Leads: {stats['total_leads']}")
        if stats.get("leads_this_month"):
            lines.append(f"Leads This Month: {stats['leads_this_month']}")
        if stats.get("conversion_rate"):
            lines.append(f"Conversion Rate: {stats['conversion_rate']}%")
        return "\n".join(lines) if lines else "No CRM stats available"

    def _format_salesperson_stats(self, stats: dict) -> str:
        """Format salesperson stats for context injection."""
        lines = []
        if stats.get("name"):
            lines.append(f"Salesperson: {stats['name']}")
        if stats.get("emails_count"):
            lines.append(f"Emails Sent: {stats['emails_count']}")
        if stats.get("calls_count"):
            lines.append(f"Calls Made: {stats['calls_count']}")
        if stats.get("meetings_count"):
            lines.append(f"Meetings: {stats['meetings_count']}")
        if stats.get("new_deals_count"):
            lines.append(f"New Deals: {stats['new_deals_count']}")
        return "\n".join(lines) if lines else "No salesperson stats available"

    async def chat(
        self,
        message: str,
        conversation_history: list[dict],
        context_type: str = "general",
        context_data: Optional[str] = None,
    ) -> tuple[str, int, int]:
        """
        Send a message and get AI response.

        Args:
            message: The user's message
            conversation_history: List of previous messages [{"role": "user"|"assistant", "content": "..."}]
            context_type: Type of context (general, lead_analysis, coaching)
            context_data: Pre-formatted context string

        Returns:
            Tuple of (response_text, input_tokens, output_tokens)
        """
        self._ensure_client()

        # Build system prompt with context
        system = SYSTEM_PROMPT
        if context_data:
            system = f"{SYSTEM_PROMPT}\n\n{context_data}"

        # Build messages array
        messages = []
        for msg in conversation_history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        # Add current message
        messages.append({
            "role": "user",
            "content": message,
        })

        # Call Anthropic API
        response = self.client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=system,
            messages=messages,
        )

        # Extract response
        response_text = response.content[0].text
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens

        return response_text, input_tokens, output_tokens

    def generate_title(self, first_message: str) -> str:
        """Generate a conversation title from the first message."""
        # Simple truncation for now - could use AI for better titles
        max_length = 50
        title = first_message.strip()
        if len(title) > max_length:
            title = title[:max_length - 3] + "..."
        return title


# Singleton instance
ai_consultant = AIConsultant()
