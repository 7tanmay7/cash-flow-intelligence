from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from database import engine, Base, get_db
from models import Customer, Invoice, PaymentPrediction, BankStatementRow
from seed import generate_seed_data
from train_model import run_training_pipeline
from ml_model import get_feature_importance, predict_invoice_risk
from prioritization import get_collections_priority_queue
from cash_application import run_cash_application_matching, resolve_manual_match
from ai_assistant import generate_ai_collection_outreach, verify_hallucination_guardrail

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cash Flow Intelligence API",
    description="AI Order-to-Cash & Collections Decision Engine",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class AssistantContextRequest(BaseModel):
    customer_id: Optional[str] = "CUST-101"
    customer_name: Optional[str] = "ABC Corp"
    outstanding_amount: float = 4200000.0
    days_overdue: int = 31
    usual_payment_behavior: Optional[str] = "12 days late"
    previous_delay_reason: Optional[str] = "invoice dispute"
    recommended_action: Optional[str] = "send escalation email"

class ManualMatchRequest(BaseModel):
    bank_statement_id: str
    invoice_id: str


@app.get("/")
def read_root():
    return {"status": "ONLINE", "system": "Cash Flow Intelligence - Order-to-Cash Decision Engine"}


@app.post("/api/seed")
def trigger_seed():
    """Generates synthetic dataset (~30 customers, ~500 invoices across 2 years, bank statements)."""
    try:
        generate_seed_data()
        return {"status": "SUCCESS", "message": "Database seeded with ~30 customers and ~500 invoices."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/train")
def trigger_train():
    """Trains XGBoost payment prediction model and scores open invoices."""
    try:
        res = run_training_pipeline()
        return {"status": "SUCCESS", "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/summary")
def get_risk_summary(db: Session = Depends(get_db)):
    """Module 1 endpoint: Overview of payment risk predictions, risk breakdown, and XGBoost feature importance."""
    total_invoices = db.query(Invoice).filter(Invoice.status.in_(["OPEN", "OVERDUE"])).count()
    if total_invoices == 0:
        # Seed automatically if empty
        generate_seed_data()
        run_training_pipeline()

    open_invoices = db.query(Invoice).filter(Invoice.status.in_(["OPEN", "OVERDUE"])).all()
    
    total_outstanding = sum(inv.outstanding_amount for inv in open_invoices)
    
    predictions = db.query(PaymentPrediction).all()
    
    risk_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    high_risk_amount = 0.0
    
    table_data = []
    for inv in open_invoices:
        cust = inv.customer
        pred = inv.prediction
        
        if not pred:
            pred_dict = predict_invoice_risk(inv, cust)
            r_label = pred_dict["risk_label"]
            l_prob = pred_dict["late_probability"]
            e_days = pred_dict["expected_payment_days"]
        else:
            r_label = pred.risk_label
            l_prob = pred.late_probability
            e_days = pred.expected_payment_days

        risk_counts[r_label] += 1
        if r_label == "HIGH":
            high_risk_amount += inv.outstanding_amount

        table_data.append({
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_id": cust.id,
            "customer_name": cust.name,
            "amount": inv.outstanding_amount,
            "issue_date": inv.issue_date,
            "due_date": inv.due_date,
            "status": inv.status,
            "dispute_flag": inv.dispute_flag,
            "expected_payment_days": e_days,
            "late_probability": l_prob,
            "risk_label": r_label
        })

    feature_importances = get_feature_importance()

    return {
        "metrics": {
            "total_open_invoices": total_invoices,
            "total_outstanding_amount": total_outstanding,
            "high_risk_amount": high_risk_amount,
            "high_risk_percentage": round((high_risk_amount / total_outstanding * 100), 1) if total_outstanding > 0 else 0,
            "risk_distribution": risk_counts
        },
        "feature_importances": feature_importances,
        "invoices": table_data
    }


@app.get("/api/collections/priority")
def get_priority_queue(
    dispute_penalty: bool = Query(True, description="Toggle whether disputes add a penalty multiplier"),
    db: Session = Depends(get_db)
):
    """Module 2 endpoint: Deterministic Collections Prioritization Queue (sorted worklist)."""
    worklist = get_collections_priority_queue(
        db,
        dispute_multiplier_active=dispute_penalty,
        group_by_customer=True
    )
    return {
        "formula": "Collection Priority = Amount × Probability of Late Payment × Days Outstanding (× 1.25 if Dispute)",
        "dispute_penalty_active": dispute_penalty,
        "worklist": worklist
    }


@app.post("/api/assistant/summarize")
def generate_assistant_summary(req: AssistantContextRequest):
    """Module 3 endpoint: Takes deterministic context, calls LLM for summary/draft, and runs hallucination guardrail."""
    context_dict = req.dict()
    res = generate_ai_collection_outreach(context_dict)
    return res


@app.post("/api/cash-application/match")
def match_cash_application(db: Session = Depends(get_db)):
    """Module 4 endpoint: Scans bank statement lines and applies deterministic rule hierarchy."""
    res = run_cash_application_matching(db)
    return res


@app.post("/api/cash-application/resolve")
def resolve_cash_match(req: ManualMatchRequest, db: Session = Depends(get_db)):
    """Module 4 endpoint: Manually resolve unmatched bank statement row to an invoice."""
    try:
        res = resolve_manual_match(db, req.bank_statement_id, req.invoice_id)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
