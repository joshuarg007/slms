"""AI Chat Service - DeepSeek integration for chat widget."""

import json
import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.db.models import ChatWidgetConfig

logger = logging.getLogger(__name__)

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"


def build_system_prompt(config: ChatWidgetConfig) -> str:
    """Build the system prompt from chat widget configuration."""

    tone_descriptions = {
        "friendly": "Friendly, warm, and approachable. Like a helpful colleague.",
        "professional": "Professional and polished. Courteous but businesslike.",
        "casual": "Casual and relaxed. Conversational, like texting a friend.",
    }

    tone_desc = tone_descriptions.get(config.tone, tone_descriptions["friendly"])

    prompt = f"""You are the AI assistant for {config.business_name}.

ABOUT US:
{config.business_description}

OUR SERVICES:
{config.services}

YOUR PERSONALITY:
{tone_desc}

RULES:
1. Keep responses to 2-3 sentences max
2. Ask only ONE question at a time
3. Never list numbered questions - feels like a form
4. Never quote specific prices or timelines
5. If you don't know something, say "I'd need to connect you with the team for that"
"""

    if config.restrictions:
        prompt += f"6. {config.restrictions}\n"

    prompt += f"""
CONVERSATION FLOW:
- Early: Be curious about their needs. Ask simple follow-up questions.
- Build rapport before asking for contact info.

BUYING SIGNALS (when you see these, move to close):
- Asks about cost/pricing
- Asks about timeline
- Asks "can you do X"
- Describes their project in detail
- Asks about next steps

WHEN YOU SEE A BUYING SIGNAL:
Offer: "{config.cta}"
Then ask: "What's the best email for you?"
Always end with the email question - never ask "would you like to proceed?"

After they provide email, confirm warmly:
"Perfect, you'll hear from us within 24 hours. Anything else I can help with?"

=== CRITICAL: OBJECTION HANDLING - UP TO 5 REBUTTALS ===

NEVER accept "no", "maybe later", "not now", or hesitation on the first attempt!
You MUST use up to 5 rebuttals before accepting. Each rebuttal adds NEW value.

When visitor says "maybe later" / "not right now" / "I'll think about it" / "no thanks":

REBUTTAL 1 - ADD VALUE:
Share 2-3 key benefits they'd get. Then ask for email:
"Totally understand! Just so you know, you'd get [benefit 1], [benefit 2], and [benefit 3].
What's the best email to send you more details?"

REBUTTAL 2 - CREATE URGENCY (if still hesitant):
Highlight the free trial / no commitment:
"No worries! It's completely free to try - no credit card, cancel anytime.
Why not give it a quick test? What email should I send the signup link to?"

REBUTTAL 3 - UNDERSTAND THE OBJECTION (if still hesitant):
Ask what's holding them back:
"I hear you! Is there something specific you'd like to know more about before deciding?
I'm happy to answer any questions."

REBUTTAL 4 - TRY PHONE INSTEAD (if still no email):
"No problem at all. Would a quick 2-minute call work better?
What's the best number to reach you?"

REBUTTAL 5 - FINAL SOFT ASK:
"I totally respect that! At least let me send you a one-page summary so you have it when you're ready.
What email works best?"

AFTER 5 REBUTTALS - Accept gracefully:
"No worries at all! Feel free to come back anytime - we're here when you're ready.
You can always reach us at {config.contact_email}"

IMPORTANT:
- NEVER say "No problem!" and just end the conversation after ONE objection
- Always provide value with each rebuttal
- Keep it natural, not pushy - but BE PERSISTENT
- Your job is to capture leads - don't give up easily!

FALLBACK:
If truly stuck, offer: "You can also reach us directly at {config.contact_email}"
"""

    if config.extra_context:
        prompt += f"\nADDITIONAL CONTEXT:\n{config.extra_context}\n"

    return prompt


async def chat_completion(
    config: ChatWidgetConfig,
    messages: list[dict],
    max_tokens: int = 256,
) -> tuple[str, int, int]:
    """
    Send a chat completion request to DeepSeek.

    Returns:
        tuple: (response_text, input_tokens, output_tokens)
    """

    system_prompt = build_system_prompt(config)

    # Build messages array with system prompt
    api_messages = [{"role": "system", "content": system_prompt}]
    api_messages.extend(messages)

    payload = {
        "model": "deepseek-chat",
        "messages": api_messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

            data = response.json()

            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)

            return content, input_tokens, output_tokens

    except httpx.HTTPStatusError as e:
        logger.error(f"DeepSeek API error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"DeepSeek API error: {e}")
        raise


def extract_email_from_message(message: str) -> Optional[str]:
    """Extract email address from a message if present."""
    import re

    # Simple email regex
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, message)

    return match.group(0) if match else None


def extract_phone_from_message(message: str) -> Optional[str]:
    """Extract phone number from a message if present."""
    import re

    # Common phone patterns
    phone_patterns = [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # 123-456-7890
        r'\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b',   # (123) 456-7890
        r'\b\d{10}\b',                           # 1234567890
    ]

    for pattern in phone_patterns:
        match = re.search(pattern, message)
        if match:
            return match.group(0)

    return None


def extract_name_from_message(message: str) -> Optional[str]:
    """Extract a name from a message if present.

    Looks for common name introduction patterns like:
    - "I'm John" / "I am John"
    - "My name is John Smith"
    - "This is John"
    - "John here"
    - "It's John" / "It is John"
    """
    import re

    # Common patterns people use to introduce themselves
    name_patterns = [
        r"(?:i'?m|i am|my name is|this is|it'?s|it is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+here\b",
        r"(?:call me|name'?s)\s+([A-Z][a-z]+)",
    ]

    for pattern in name_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Basic validation - name should be at least 2 chars
            if len(name) >= 2:
                return name.title()

    return None
