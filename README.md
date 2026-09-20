# Cash Flow Intelligence (AI Order-to-Cash & Collections Decision Engine)

**Cash Flow Intelligence** is an enterprise-grade CFO / Accounts Receivable control system covering payment risk prediction, collections prioritization, AI collections outreach, and automated cash application.

---

## 🏛️ Core Design Philosophy: Why Deterministic + LLM Beats a Generic Chatbot

> **Fundamental Principle**: Keep all financial calculations, risk scoring, priority rankings, and cash matching **100% deterministic and testable**. Use the LLM **strictly for summarization, drafting, and natural-language tasks** — never for financial math or risk decisions.

In financial engineering, letting an LLM calculate risk scores or compute outstanding balances leads to non-deterministic errors, unpredictable behavior, and un-auditable outputs. In this platform:
1. **Payment Risk**: Predicted by **XGBoost regression and classification** trained on 420+ historical payment records with logged feature importances.
2. **Collections Priority**: Computed using a **pure deterministic mathematical formula** ($Amount \times LateProbability \times DaysOutstanding$).
3. **Cash Matching**: Driven by a **strict rule-hierarchy engine** with exact confidence scores.
4. **AI Assistant**: Uses Anthropic's Claude API scoped with a tight system prompt constraint and protected by a **Numeric Hallucination Guardrail Engine**.

---

## 📐 System Architecture

```
ERP / Invoice CSV / Seed Generator
            │
            ▼
┌────────────────────────────────────────────────────────┐
│             SQLite / PostgreSQL Database               │
│    (Customers, Invoices, Payments, Bank Statements)    │
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Module 1    │   │   Module 2    │   │   Module 4    │
│ XGBoost Risk  │   │ Deterministic │   │ Cash Matching │
│ Predictor ML  │   │ Priority Queue│   │ Rules Engine  │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │       Module 3        │
                │ LLM AI Assistant &    │
                │ Hallucination Shield  │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   React CFO Dashboard │
                │  (Editorial Design)   │
                └───────────────────────┘
```

---

## 📦 System Modules

### Module 1 — Payment Prediction (XGBoost ML)
- **Engine**: XGBoost Regressor & Classifier (`ml_model.py`).
- **Features**: `historical_avg_delay`, `invoice_amount`, `payment_terms_days`, `credit_utilization_ratio`, `dispute_flag`, `industry_risk_score`, `days_since_issue`.
- **Outputs**: `expected_payment_days`, `late_probability` (0–1), `risk_label` (LOW/MEDIUM/HIGH).
- **Explainability**: Logged feature importances saved in `feature_importance.json` and rendered live in the dashboard.

### Module 2 — Collections Prioritization (Pure Deterministic)
- **Formula**:
  $$\text{Collection Priority} = \text{Amount} \times \text{Probability of Late Payment} \times \text{Days Outstanding} \quad (\times 1.25 \text{ if Dispute})$$
- **Prompt Replicate**: Ranks Customer **ABC Corp** (₹42L outstanding, 91% late prob, 31 days overdue, active dispute) as Rank #1 ahead of **XYZ Ltd** (₹18L outstanding, 83% late prob).

### Module 3 — AI Collection Assistant & Hallucination Guardrail
- **Input Context**: Assembled deterministically by the backend (Customer name, amount, days overdue, behavior, delay reason, recommended action).
- **System Prompt**: `"You only summarize and draft language. You do not calculate, estimate, or invent any financial figures. Use only the numbers provided."`
- **Hallucination Guardrail**: Runs a numeric diff check comparing every number in the LLM response against context numbers. Displays a green **0 Hallucinations Detected** audit badge in the UI.

### Module 4 — Cash Application (Rule Hierarchy Engine)
- **Matching Rules**:
  1. **Exact Reference Match**: Bank reference matches invoice number → Confidence: ~99.0%.
  2. **Exact Amount + Customer Fuzzy Match**: Amount matches & customer name similarity > 60% → Confidence: ~90.0%.
  3. **Amount + Date Window**: Amount matches within ±14 days of due date → Confidence: 75.0%.
  4. **Unmatched Bucket**: Flagged for manual UI resolution modal (100% confidence upon confirmation).
- **Prompt Replicate**: ₹8,72,400 received with reference `NEFT-AX29183` matches invoice `INV-8231` with 97.4% confidence.

---

## 🎨 Editorial Design System

The frontend is styled according to the specified editorial, warm-contrast design system:
- **Background**: Warm off-white (`#F8F7F3`)
- **Primary Text**: Deep charcoal (`#121212`)
- **Accents**: Muted copper/gold (`#C5A059`)
- **Risk Colors**: Brick Red (`#B5443A`), Sage Green (`#4C6B4F`)
- **Typography**: `Playfair Display` for page titles & card headers; `Inter` tabular-nums for all numbers and tables.

---

## 🚀 How to Run & Demo

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup & Server Start
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run seed data generator (~30 customers, ~500 invoices across 2 years)
python seed.py

# Train XGBoost model and score open invoices
python train_model.py

# Start FastAPI server (runs on port 8000)
python -m uvicorn main:app --reload --port 8000
```

### 3. Run Pytest Suite
```bash
cd backend
python -m pytest tests/test_engine.py -v
```

### 4. Frontend Setup & Dev Server
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (runs on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser to access the CFO Dashboard.

---

## 🎯 Interview Walkthrough Script

1. **Demonstrate Auditability**: Show the XGBoost Feature Importance chart in Tab 1. Explain how `historical_avg_delay` and `dispute_flag` drive the predictions.
2. **Explain Priority Ranking**: Switch to Tab 2 (Collections Priority Queue). Point out the exact formula: $Amount \times LateProbability \times DaysOutstanding$. Show how ABC Corp ranks above XYZ Ltd deterministically.
3. **Show Hallucination Shield**: Open Tab 3 (AI Assistant). Generate an outreach draft for ABC Corp and highlight the green **0 Hallucinations Detected** audit shield.
4. **Match Cash Receipts**: Go to Tab 4 (Cash Application). Click **Run Cash Application Match** to see `NEFT-AX29183` match `INV-8231` with 97.4% confidence, then resolve an unmatched receipt via the manual resolution modal.
