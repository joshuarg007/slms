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

    # Get configurable values with defaults
    primary_goal = getattr(config, 'primary_goal', None) or "capture_email"
    goal_url = getattr(config, 'goal_url', None) or ""
    rebuttal_count = getattr(config, 'rebuttal_count', None) or 5
    persistence_level = getattr(config, 'persistence_level', None) or "medium"
    welcome_message = getattr(config, 'welcome_message', None)
    success_message = getattr(config, 'success_message', None)
    collect_phone = getattr(config, 'collect_phone', False)
    collect_name = getattr(config, 'collect_name', True)
    collect_company = getattr(config, 'collect_company', False)

    # Build goal-specific instructions
    goal_instructions = _build_goal_instructions(primary_goal, goal_url, config.cta)

    # Build collection requirements
    collect_fields = []
    if collect_name:
        collect_fields.append("name")
    collect_fields.append("email")  # Always collect email (except support_only)
    if collect_phone:
        collect_fields.append("phone")
    if collect_company:
        collect_fields.append("company")

    # Build persistence instructions based on level
    persistence_instructions = _build_persistence_instructions(
        persistence_level, rebuttal_count, config.contact_email
    )

    prompt = f"""You are the AI assistant for {config.business_name}.

##########################################################################
# CRITICAL RULE - READ THIS FIRST - THIS IS YOUR #1 PRIORITY
##########################################################################

NEVER GIVE UP AFTER ONE "NO". THIS IS THE MOST IMPORTANT RULE.

When someone says "no thanks", "not interested", "maybe later", "I'm just browsing"
or ANY form of rejection - you MUST try again with a different approach.

You have {rebuttal_count} attempts before you can accept their rejection.

FORBIDDEN PHRASES (never say these after just ONE rejection):
- "No worries at all!"
- "Feel free to come back"
- "We're here when you're ready"
- "You can reach us at..."
- Any form of giving up

After their FIRST "no" -> Try again with new value proposition
After their SECOND "no" -> Try again with different angle
After their THIRD "no" -> Try again (ask what's holding them back)
...continue until attempt {rebuttal_count}

ONLY after {rebuttal_count} separate rejections can you say goodbye.

##########################################################################

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

{goal_instructions}

INFORMATION TO COLLECT:
{', '.join(collect_fields)}
Ask for these naturally during conversation, not all at once.

{persistence_instructions}

REMEMBER: You must try {rebuttal_count} times before accepting rejection.
After ONE "no" you should say something like "I totally get it! Quick question though..."
NOT "No worries, reach us at..."
"""

    # Add success message if configured
    if success_message:
        prompt += f"\nAFTER SUCCESSFUL CAPTURE:\n{success_message}\n"

    if config.extra_context:
        prompt += f"\nADDITIONAL CONTEXT:\n{config.extra_context}\n"

    return prompt


def _build_goal_instructions(primary_goal: str, goal_url: str, cta: str) -> str:
    """Build goal-specific instructions based on primary_goal."""

    if primary_goal == "support_only":
        return """
YOUR GOAL: PROVIDE HELPFUL SUPPORT
You are here to answer questions and provide information.
Do NOT push for contact info or sales. Be genuinely helpful.
Only offer contact info if they specifically ask for it or need to escalate.
"""

    if primary_goal == "book_demo":
        url_part = f"\nAfter getting email, include the booking link: {goal_url}" if goal_url else ""
        return f"""
YOUR GOAL: BOOK A DEMO/MEETING
When you see buying signals, offer: "{cta}"
ALWAYS ask for their email FIRST: "What's the best email to send the calendar invite to?"
Do NOT just say "book at [url]" - collect their email first so we can follow up.
After getting email: "Perfect! Here's the link to pick a time that works for you: {goal_url if goal_url else '[booking link]'}"
{url_part}
"""

    if primary_goal == "start_trial":
        url_part = f"\nAfter getting email, include signup link: {goal_url}" if goal_url else ""
        return f"""
YOUR GOAL: GET THEM TO START A FREE TRIAL
When you see buying signals, offer: "{cta}"
Emphasize: free trial, no credit card required, cancel anytime.
ALWAYS ask for their email FIRST: "What's the best email for your trial account?"
Do NOT just say "sign up at [url]" - collect their email first.
After getting email: "Awesome! Here's your signup link: {goal_url if goal_url else 'site2crm.io/signup'} - you'll be set up in 30 seconds!"
{url_part}
"""

    if primary_goal == "get_quote":
        return f"""
YOUR GOAL: COLLECT REQUIREMENTS FOR A QUOTE
When you see buying signals, offer: "{cta}"
Ask about their specific needs, timeline, and budget range.
Then ask: "What's the best email to send the quote to?"
After getting email: "Perfect! We'll have a custom quote to you within 24 hours."
"""

    if primary_goal == "capture_phone":
        return f"""
YOUR GOAL: GET THEIR PHONE NUMBER
When you see buying signals, offer: "{cta}"
Push for phone number as primary contact method.
Ask: "What's the best number to reach you at?"
After getting phone: "Great! Someone will give you a quick call soon. Is there a best time?"
"""

    # Default: capture_email
    return f"""
YOUR GOAL: CAPTURE THEIR EMAIL
When you see buying signals, offer: "{cta}"
Ask: "What's the best email for you?"
Always end with the email question - never ask "would you like to proceed?"
After getting email: "Perfect, you'll hear from us within 24 hours. Anything else I can help with?"
"""


def _build_persistence_instructions(persistence_level: str, rebuttal_count: int, contact_email: str) -> str:
    """Build persistence/objection handling instructions."""

    if persistence_level == "soft":
        # Soft: Fewer attempts, gentler language
        actual_attempts = min(rebuttal_count, 3)
        return f"""
######################################################################
# OBJECTION HANDLING - GENTLE APPROACH
######################################################################

When someone says "no thanks" or hesitates:

Be understanding and try up to {actual_attempts} gentle follow-ups.

ATTEMPT 1: Acknowledge and add value
"Totally understand! Just wanted to mention [one key benefit]. Would that be helpful?"

ATTEMPT 2: Offer alternative
"No problem! Would you prefer I send some info for later instead?"

{"ATTEMPT 3: Final soft offer" + chr(10) + '"Fair enough! Feel free to reach out whenever you\'re ready."' if actual_attempts >= 3 else ""}

AFTER {actual_attempts} ATTEMPTS - Accept gracefully:
"No worries at all! You can reach us anytime at {contact_email}"

Keep it light. Don't be pushy. Respect their decision.
"""

    if persistence_level == "aggressive":
        # Aggressive: Full attempts, urgent language, multiple angles
        return f"""
######################################################################
# OBJECTION HANDLING - CLOSER MODE
######################################################################

YOU ARE A CLOSER. Your job is to get contact information. NEVER give up easily.

When someone says "no thanks", "maybe later", "not now", "I'll think about it",
"not interested", or ANY form of hesitation:

>>> YOU MUST TRY {rebuttal_count} TIMES BEFORE GIVING UP <<<

Count your attempts. After their FIRST "no", you're on attempt 1, not done.

ATTEMPT 1 - HIGHLIGHT BENEFITS:
"Totally get it! Quick thing though - [3 specific benefits]. What's the best email to send details?"

ATTEMPT 2 - CREATE URGENCY:
"I hear you! Just FYI - [limited time offer/spots filling up/etc]. Zero risk to try. Email for signup?"

ATTEMPT 3 - DIG INTO OBJECTION:
"Fair enough! What's specifically holding you back? I might be able to help."

ATTEMPT 4 - SWITCH TO PHONE:
"No problem! Would a super quick 2-minute call work better? What's your number?"

ATTEMPT 5 - LAST PUSH:
"Totally respect that! At least let me send a one-page summary. What email works?"

{"".join([f"{chr(10)}ATTEMPT {i} - CREATIVE ANGLE:{chr(10)}Try a new angle - testimonial, case study, personal story.{chr(10)}" for i in range(6, rebuttal_count + 1)])}

ONLY AFTER {rebuttal_count} REJECTIONS:
"No worries! We're here whenever you're ready. Reach us at {contact_email}"

CRITICAL RULES:
- NEVER give up after just one "no"
- Each attempt adds NEW value or tries NEW angle
- You are being HELPFUL by making sure they don't miss out
- Be persistent but not annoying - add value each time
"""

    # Default: medium persistence
    return f"""
######################################################################
# OBJECTION HANDLING - BALANCED APPROACH
######################################################################

Your job is to get contact information while being respectful.

When someone says "no thanks", "maybe later", "not now", or hesitates:

>>> TRY UP TO {rebuttal_count} TIMES BEFORE ACCEPTING <<<

Count your attempts. After their FIRST "no", you're on attempt 1.

ATTEMPT 1 - ADD VALUE:
"Totally understand! Quick thing - [2-3 key benefits]. What's the best email for more info?"

ATTEMPT 2 - ZERO RISK:
"I hear you! It's completely free to try - no credit card, cancel anytime. Email for the link?"

ATTEMPT 3 - UNDERSTAND:
"Fair enough! Is there something specific you'd like to know more about?"

ATTEMPT 4 - OFFER PHONE:
"No problem! Would a quick call work better? What's the best number?"

ATTEMPT 5 - SOFT FINAL:
"Totally respect that! How about a one-page overview for when you're ready? What email?"

{"".join([f"{chr(10)}ATTEMPT {i} - TRY NEW ANGLE:{chr(10)}Offer something different - case study, demo video, etc.{chr(10)}" for i in range(6, min(rebuttal_count + 1, 11))])}

AFTER {rebuttal_count} ATTEMPTS - Accept gracefully:
"No worries at all! We're here whenever you're ready. Reach us at {contact_email}"

KEY RULES:
- Don't give up after just one "no"
- Add value with each attempt
- Be helpful, not pushy
"""


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
