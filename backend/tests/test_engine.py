import os
import sys
import pytest

# Add parent dir to path so imports work smoothly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prioritization import calculate_priority_score
from cash_application import match_bank_statement_row
from ai_assistant import verify_hallucination_guardrail
from models import BankStatementRow, Invoice, Customer

def test_collections_prioritization_formula():
    """
    Module 2 Unit Test: Verify deterministic formula:
    Collection Priority = Amount * Probability of Late Payment * Days Outstanding (* 1.25 if dispute)
    """
    # Test case 1: Customer ABC Corp (₹42,00,000, 91% late prob, 31 days outstanding, dispute = True)
    score_abc = calculate_priority_score(
        amount=4200000.0,
        late_probability=0.91,
        days_outstanding=31,
        has_dispute=True,
        dispute_multiplier_active=True
    )
    
    # Expected: 4200000 * 0.91 * 31 * 1.25 = 148,150,500.0
    expected_abc = 4200000.0 * 0.91 * 31 * 1.25
    assert abs(score_abc - expected_abc) < 1.0

    # Test case 2: Customer XYZ Ltd (₹18,00,000, 83% late prob, 31 days outstanding, dispute = False)
    score_xyz = calculate_priority_score(
        amount=1800000.0,
        late_probability=0.83,
        days_outstanding=31,
        has_dispute=False,
        dispute_multiplier_active=True
    )

    # Assert ABC Corp ranks above XYZ Ltd
    assert score_abc > score_xyz


def test_cash_application_matching_hierarchy():
    """
    Module 4 Unit Test: Verify rule priority hierarchy:
    Exact Reference Match (99%) > Amount + Fuzzy Customer Match (>85%) > Unmatched (0%)
    """
    # Mock Customer & Open Invoices
    cust = Customer(id="CUST-101", name="ABC Corp", industry="Manufacturing")
    inv = Invoice(
        id="INV-8231",
        invoice_number="INV-8231",
        customer_id="CUST-101",
        amount=872400.0,
        outstanding_amount=872400.0,
        issue_date="2026-08-01",
        due_date="2026-08-31",
        status="OVERDUE",
        customer=cust
    )
    open_invoices = [inv]
    customers = [cust]

    # Test 1: Exact Reference Match (NEFT-AX29183)
    row_ref = BankStatementRow(
        id="BST-1", statement_date="2026-09-01", amount=872400.0, payer_name="ABC Corp", reference="NEFT-AX29183"
    )
    res_ref = match_bank_statement_row(row_ref, open_invoices, customers)
    assert res_ref["matched_invoice_id"] == "INV-8231"
    assert res_ref["confidence_score"] >= 97.0
    assert res_ref["match_type"] == "EXACT_REFERENCE"

    # Test 2: Amount + Customer Fuzzy Match (No ref match)
    row_fuzzy = BankStatementRow(
        id="BST-2", statement_date="2026-09-01", amount=872400.0, payer_name="ABC CORPORATION PVT LTD", reference="UNKNOWN-REF-123"
    )
    res_fuzzy = match_bank_statement_row(row_fuzzy, open_invoices, customers)
    assert res_fuzzy["matched_invoice_id"] == "INV-8231"
    assert res_fuzzy["confidence_score"] >= 85.0
    assert res_fuzzy["match_type"] == "AMOUNT_CUSTOMER_FUZZY"

    # Test 3: Unmatched Row
    row_unmatched = BankStatementRow(
        id="BST-3", statement_date="2026-09-01", amount=999999.0, payer_name="Random Corp", reference="REF-NONE"
    )
    res_unmatched = match_bank_statement_row(row_unmatched, open_invoices, customers)
    assert res_unmatched["matched_invoice_id"] is None
    assert res_unmatched["confidence_score"] == 0.0
    assert res_unmatched["match_type"] == "NONE"


def test_ai_assistant_hallucination_guardrail():
    """
    Module 3 Unit Test: Verify Hallucination Guardrail numeric diff check.
    """
    context = {
        "customer_name": "ABC Corp",
        "outstanding_amount": 4200000.0,
        "days_overdue": 31,
        "usual_payment_behavior": "12 days late",
        "previous_delay_reason": "invoice dispute",
        "recommended_action": "send escalation email"
    }

    # Valid output (uses only numbers present in context: 4200000, 31, 12)
    valid_summary = "ABC Corp has an outstanding balance of ₹42,00,000 overdue by 31 days."
    valid_email = "According to records, their historical delay is 12 days."

    res_valid = verify_hallucination_guardrail(context, valid_summary, valid_email)
    assert res_valid["passed_guardrail"] is True
    assert res_valid["hallucination_detected"] is False

    # Invalid output (LLM introduces hallucinated figure: 999999)
    hallucinated_summary = "ABC Corp owes ₹42,00,000 but we offer a discount of 999999 rupees."
    hallucinated_email = "Payment was expected 31 days ago."

    res_invalid = verify_hallucination_guardrail(context, hallucinated_summary, hallucinated_email)
    assert res_invalid["passed_guardrail"] is False
    assert res_invalid["hallucination_detected"] is True
    assert "999999" in res_invalid["unauthorized_numbers"]
