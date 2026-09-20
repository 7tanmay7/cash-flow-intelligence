import os
import re
import json
from typing import Dict, Any, List

def extract_all_numbers(text: str) -> List[str]:
    """
    Extracts numerical strings (including currency formatted numbers like 42,00,000 or 42L or 31) from text.
    Returns clean numeric tokens.
    """
    # Remove commas
    text_clean = text.replace(",", "")
    # Find all sequences of digits, potentially with decimals
    raw_nums = re.findall(r'\b\d+(?:\.\d+)?\b', text_clean)
    return raw_nums


def verify_hallucination_guardrail(context: Dict[str, Any], generated_summary: str, generated_email: str) -> Dict[str, Any]:
    """
    Numeric-diff guardrail check:
    Extracts all numeric values present in input context.
    Ensures that any number appearing in generated_summary or generated_email exists in the input context.
    """
    # Collect all numeric values in context
    context_str = json.dumps(context)
    allowed_numeric_strings = set(extract_all_numbers(context_str))

    # Also add variations (e.g. if amount is 4200000, 42 is allowed if 42L is used, etc.)
    expanded_allowed = set(allowed_numeric_strings)
    for num in allowed_numeric_strings:
        try:
            val = float(num)
            expanded_allowed.add(str(int(val)))
            if val >= 100000:
                lakhs = int(val / 100000)
                expanded_allowed.add(str(lakhs))
        except ValueError:
            pass

    # Extract numbers in generated outputs
    combined_output = f"{generated_summary} {generated_email}"
    output_numbers = extract_all_numbers(combined_output)

    unauthorized_numbers = []
    for num in output_numbers:
        if num not in expanded_allowed:
            # Check if it's a standard number like '1' or '2' for bullet points or date/year
            if num in ["1", "2", "3", "2026", "2025", "2024"]:
                continue
            unauthorized_numbers.append(num)

    is_valid = len(unauthorized_numbers) == 0

    return {
        "passed_guardrail": is_valid,
        "hallucination_detected": not is_valid,
        "unauthorized_numbers": unauthorized_numbers,
        "allowed_context_numbers": list(allowed_numeric_strings),
        "found_output_numbers": output_numbers,
        "message": "Guardrail PASSED: Zero unauthorized numbers detected." if is_valid else f"Guardrail WARNING: LLM introduced unauthorized number(s): {unauthorized_numbers}"
    }


def generate_ai_collection_outreach(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Module 3 core generator. Assembles deterministic context, prompts LLM (or deterministic language synthesizer),
    and validates response with hallucination guardrail.
    """
    customer_name = context.get("customer_name", "Valued Customer")
    outstanding_amount = context.get("outstanding_amount", 0.0)
    days_overdue = context.get("days_overdue", 0)
    usual_behavior = context.get("usual_payment_behavior", "Usually pays on time")
    previous_delay_reason = context.get("previous_delay_reason", "None")
    recommended_action = context.get("recommended_action", "send friendly reminder")

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            system_prompt = (
                "You are an AI Collections Assistant inside a CFO Order-to-Cash system. "
                "CRITICAL RULE: You only summarize and draft language. You do NOT calculate, estimate, or invent any financial figures. "
                "Use ONLY the exact numbers provided in the input context."
            )

            user_prompt = f"""
Input Context (Strict Deterministic Facts):
- Customer: {customer_name}
- Outstanding Amount: ₹{outstanding_amount:,.2f}
- Days Overdue: {days_overdue} days
- Historical Behavior: {usual_behavior}
- Previous Delay Reason: {previous_delay_reason}
- Recommended Action: {recommended_action}

Tasks:
1. Provide a 1-2 sentence executive summary of the collection situation.
2. Draft an outreach email to the customer matching the recommended action tone.

Respond in JSON format with keys "summary" and "draft_email".
"""

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=600,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )

            content_text = response.content[0].text
            parsed = json.loads(content_text)
            summary = parsed.get("summary", "")
            draft_email = parsed.get("draft_email", "")

        except Exception as e:
            # Fallback synthesizer if API call fails or key invalid
            summary, draft_email = synthesize_deterministic_language(
                customer_name, outstanding_amount, days_overdue, usual_behavior, previous_delay_reason, recommended_action
            )
    else:
        # High quality offline fallback synthesizer
        summary, draft_email = synthesize_deterministic_language(
            customer_name, outstanding_amount, days_overdue, usual_behavior, previous_delay_reason, recommended_action
        )

    # Run Hallucination Guardrail Check
    guardrail_res = verify_hallucination_guardrail(context, summary, draft_email)

    return {
        "context": context,
        "summary": summary,
        "draft_email": draft_email,
        "guardrail": guardrail_res
    }


def synthesize_deterministic_language(
    customer_name: str,
    outstanding_amount: float,
    days_overdue: int,
    usual_behavior: str,
    previous_delay_reason: str,
    recommended_action: str
) -> (str, str):
    """Fallback synthesizer that generates crisp language using strictly the input context values."""
    amount_str = f"₹{outstanding_amount:,.2f}"

    if recommended_action == "send escalation email":
        summary = (
            f"{customer_name} has an outstanding balance of {amount_str} that is currently {days_overdue} days overdue. "
            f"Given their history ({usual_behavior}) and previous note ({previous_delay_reason}), an immediate formal escalation is required."
        )
        email = f"""Subject: URGENT: Formal Notice Regarding Overdue Balance ({customer_name})

Dear Accounts Payable Team at {customer_name},

We are writing to draw your urgent attention to the outstanding balance of {amount_str}, which is now {days_overdue} days past due.

According to our records, your historical payment trend indicates {usual_behavior}, with previous delays logged as '{previous_delay_reason}'. To avoid any disruption to ongoing services or credit facility adjustments, please confirm payment dispatch immediately.

Kindly transmit the remittance reference to our accounts department.

Sincerely,
Finance & Credit Control Team"""

    elif recommended_action == "schedule urgent call":
        summary = (
            f"{customer_name} has an overdue balance of {amount_str} ({days_overdue} days past due). "
            f"A direct finance call is recommended to align on payment settlement."
        )
        email = f"""Subject: Request for Urgent Finance Alignment - {customer_name}

Dear Finance Leadership,

I hope this message finds you well. I am reaching out regarding the open balance of {amount_str}, currently {days_overdue} days overdue.

We would like to schedule a brief 10-minute alignment call tomorrow to address any outstanding billing queries and confirm your payment schedule. Please let us know your availability.

Best regards,
AR Collections Manager"""

    else: # friendly reminder
        summary = (
            f"{customer_name} has an open invoice total of {amount_str} overdue by {days_overdue} days. "
            f"Their usual pattern shows {usual_behavior}, so a courtesy reminder is advised."
        )
        email = f"""Subject: Friendly Reminder: Outstanding Invoice Statement for {customer_name}

Hi Accounts Payable Team,

Hope you are having a productive week! 

This is a gentle reminder regarding our open invoice totaling {amount_str}, which was due {days_overdue} days ago. 

Please let us know if you need another copy of the invoice or if payment has already been processed.

Warm regards,
Credit Control Team"""

    return summary, email
