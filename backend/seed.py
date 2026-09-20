import random
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import Customer, Invoice, Payment, BankStatementRow, PaymentPrediction

def generate_seed_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Industries & typical risk profiles
    industries = ["Technology", "Manufacturing", "Retail", "Healthcare", "Logistics", "Telecom", "Automotive"]
    
    # Customer Definitions
    customers_data = [
        {"id": "CUST-101", "name": "ABC Corp", "industry": "Manufacturing", "payment_terms_days": 30, "historical_avg_delay": 12.5, "credit_limit": 10000000.0},
        {"id": "CUST-102", "name": "XYZ Ltd", "industry": "Technology", "payment_terms_days": 30, "historical_avg_delay": 9.2, "credit_limit": 5000000.0},
        {"id": "CUST-103", "name": "Reliance Retail Solutions", "industry": "Retail", "payment_terms_days": 45, "historical_avg_delay": 3.1, "credit_limit": 20000000.0},
        {"id": "CUST-104", "name": "Tata Consultancy Systems", "industry": "Technology", "payment_terms_days": 30, "historical_avg_delay": 1.5, "credit_limit": 15000000.0},
        {"id": "CUST-105", "name": "Mahindra Auto Logistics", "industry": "Logistics", "payment_terms_days": 60, "historical_avg_delay": 18.4, "credit_limit": 8000000.0},
        {"id": "CUST-106", "name": "Apex Healthcare India", "industry": "Healthcare", "payment_terms_days": 30, "historical_avg_delay": 6.8, "credit_limit": 6000000.0},
        {"id": "CUST-107", "name": "Airtel Enterprise Solutions", "industry": "Telecom", "payment_terms_days": 30, "historical_avg_delay": 2.0, "credit_limit": 12000000.0},
        {"id": "CUST-108", "name": "Bajaj Auto Components", "industry": "Automotive", "payment_terms_days": 45, "historical_avg_delay": 14.2, "credit_limit": 9000000.0},
        {"id": "CUST-109", "name": "Zomato Commercial Ltd", "industry": "Retail", "payment_terms_days": 15, "historical_avg_delay": 4.5, "credit_limit": 4000000.0},
        {"id": "CUST-110", "name": "Infosys Digital Systems", "industry": "Technology", "payment_terms_days": 30, "historical_avg_delay": 0.8, "credit_limit": 25000000.0},
    ]

    # Add 20 more realistic synthetic customers to total ~30
    company_prefixes = ["Vanguard", "Nexus", "Zenith", "Quantum", "Omega", "Starlight", "Hyperion", "Titan", "Orion", "Matrix"]
    company_suffixes = ["Industries", "Infra", "Pharma", "Exports", "Trading", "Networks", "Energy", "Services", "FMCG", "Labs"]
    
    random.seed(42)
    for i in range(11, 31):
        name = f"{random.choice(company_prefixes)} {random.choice(company_suffixes)}"
        customers_data.append({
            "id": f"CUST-{i:03d}",
            "name": name,
            "industry": random.choice(industries),
            "payment_terms_days": random.choice([15, 30, 45, 60]),
            "historical_avg_delay": round(random.uniform(0.5, 25.0), 1),
            "credit_limit": round(random.uniform(2000000.0, 15000000.0), -5)
        })

    customers = [Customer(**c) for c in customers_data]
    db.add_all(customers)
    db.commit()

    # Generate ~500 invoices spanning 2 years
    start_date = datetime.now() - timedelta(days=730)
    now = datetime.now()

    invoices = []
    payments = []
    bank_rows = []

    inv_counter = 1000

    # 1. First build explicit required test cases:
    # ABC Corp invoice: ₹12,50,000, due in 15 days from now (or open overdue)
    # ABC Corp outstanding total = ₹42,00,000
    inv_abc_1 = Invoice(
        id="INV-8231",
        invoice_number="INV-8231",
        customer_id="CUST-101",
        amount=872400.0,
        outstanding_amount=872400.0,
        issue_date=(now - timedelta(days=45)).strftime("%Y-%m-%d"),
        due_date=(now - timedelta(days=15)).strftime("%Y-%m-%d"),
        status="OVERDUE",
        dispute_flag=True,
        dispute_reason="invoice dispute"
    )

    inv_abc_2 = Invoice(
        id="INV-8232",
        invoice_number="INV-8232",
        customer_id="CUST-101",
        amount=1250000.0,
        outstanding_amount=1250000.0,
        issue_date=(now - timedelta(days=15)).strftime("%Y-%m-%d"),
        due_date=(now + timedelta(days=15)).strftime("%Y-%m-%d"),
        status="OPEN",
        dispute_flag=False,
        dispute_reason=None
    )

    inv_abc_3 = Invoice(
        id="INV-8233",
        invoice_number="INV-8233",
        customer_id="CUST-101",
        amount=2077600.0,
        outstanding_amount=2077600.0,
        issue_date=(now - timedelta(days=61)).strftime("%Y-%m-%d"),
        due_date=(now - timedelta(days=31)).strftime("%Y-%m-%d"),
        status="OVERDUE",
        dispute_flag=True,
        dispute_reason="invoice dispute"
    )

    invoices.extend([inv_abc_1, inv_abc_2, inv_abc_3])

    # XYZ Ltd outstanding = ₹18,00,000
    inv_xyz_1 = Invoice(
        id="INV-8240",
        invoice_number="INV-8240",
        customer_id="CUST-102",
        amount=1800000.0,
        outstanding_amount=1800000.0,
        issue_date=(now - timedelta(days=40)).strftime("%Y-%m-%d"),
        due_date=(now - timedelta(days=10)).strftime("%Y-%m-%d"),
        status="OVERDUE",
        dispute_flag=False,
        dispute_reason=None
    )
    invoices.append(inv_xyz_1)

    # 2. Historical Paid Invoices (~420 invoices) & Open Invoices (~80 invoices)
    ref_prefixes = ["NEFT", "RTGS", "IMPS", "UPI"]
    bank_codes = ["AXIS", "HDFC", "ICIC", "SBIN", "KOTAK"]

    for cust in customers_data:
        cust_id = cust["id"]
        avg_delay = cust["historical_avg_delay"]
        terms = cust["payment_terms_days"]

        # Generate ~15 paid historical invoices per customer
        for h in range(14):
            inv_counter += 1
            inv_id = f"INV-{inv_counter}"
            issue_d = start_date + timedelta(days=random.randint(0, 650))
            due_d = issue_d + timedelta(days=terms)
            
            # Payment delay distribution around historical avg delay
            actual_delay = max(-5, int(random.gauss(avg_delay, 5)))
            pay_d = due_d + timedelta(days=actual_delay)
            days_to_pay = (pay_d - issue_d).days
            
            amount = round(random.uniform(150000.0, 3500000.0), -3)

            inv = Invoice(
                id=inv_id,
                invoice_number=inv_id,
                customer_id=cust_id,
                amount=amount,
                outstanding_amount=0.0,
                issue_date=issue_d.strftime("%Y-%m-%d"),
                due_date=due_d.strftime("%Y-%m-%d"),
                status="PAID",
                dispute_flag=random.random() < 0.08,
                dispute_reason="price mismatch" if random.random() < 0.08 else None
            )
            invoices.append(inv)

            pay_ref = f"{random.choice(ref_prefixes)}-{random.choice(bank_codes)}{random.randint(10000,99999)}"
            pay = Payment(
                id=f"PAY-{inv_counter}",
                invoice_id=inv_id,
                amount_paid=amount,
                payment_date=pay_d.strftime("%Y-%m-%d"),
                payment_reference=pay_ref,
                days_to_pay=days_to_pay
            )
            payments.append(pay)

        # Generate 2-4 open/overdue invoices per customer if not ABC/XYZ
        if cust_id not in ["CUST-101", "CUST-102"]:
            for o in range(random.randint(2, 4)):
                inv_counter += 1
                inv_id = f"INV-{inv_counter}"
                days_ago = random.randint(10, 90)
                issue_d = now - timedelta(days=days_ago)
                due_d = issue_d + timedelta(days=terms)
                
                is_overdue = due_d < now
                status = "OVERDUE" if is_overdue else "OPEN"
                amount = round(random.uniform(200000.0, 4500000.0), -3)
                has_dispute = random.random() < 0.12

                inv = Invoice(
                    id=inv_id,
                    invoice_number=inv_id,
                    customer_id=cust_id,
                    amount=amount,
                    outstanding_amount=amount,
                    issue_date=issue_d.strftime("%Y-%m-%d"),
                    due_date=due_d.strftime("%Y-%m-%d"),
                    status=status,
                    dispute_flag=has_dispute,
                    dispute_reason="delivery discrepancy" if has_dispute else None
                )
                invoices.append(inv)

    db.add_all(invoices)
    db.commit()

    db.add_all(payments)
    db.commit()

    # Update Customer total_outstanding
    for c in db.query(Customer).all():
        total_out = sum(i.outstanding_amount for i in c.invoices if i.status in ["OPEN", "OVERDUE"])
        c.total_outstanding = total_out
    db.commit()

    # Bank Statement Rows for Cash Application testing
    # Include exact example from prompt: ₹8,72,400 received, reference NEFT-AX29183 -> matched to invoice INV-8231
    bank_rows.append(BankStatementRow(
        id="BST-5001",
        statement_date=now.strftime("%Y-%m-%d"),
        amount=872400.0,
        payer_name="ABC CORP LTD",
        reference="NEFT-AX29183", # Will match INV-8231 reference / amount
        status="UNMATCHED",
        matched_invoice_id=None,
        confidence_score=0.0,
        match_type="NONE"
    ))

    # Add exact amount + fuzzy customer name row (Rule 2)
    inv_xyz = db.query(Invoice).filter(Invoice.id == "INV-8240").first()
    bank_rows.append(BankStatementRow(
        id="BST-5002",
        statement_date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
        amount=1800000.0,
        payer_name="XYZ TECHNOLOGIES INDIA", # Fuzzy match for XYZ Ltd
        reference="RTGS-HDFC90182",
        status="UNMATCHED",
        matched_invoice_id=None,
        confidence_score=0.0,
        match_type="NONE"
    ))

    # Add amount + date window row (Rule 3)
    # Pick another open invoice
    sample_open = db.query(Invoice).filter(Invoice.status == "OPEN", Invoice.customer_id == "CUST-103").first()
    if sample_open:
        bank_rows.append(BankStatementRow(
            id="BST-5003",
            statement_date=sample_open.due_date,
            amount=sample_open.amount,
            payer_name="RELIANCE RETAIL PAYMENTS",
            reference="NEFT-SBIN88712",
            status="UNMATCHED",
            matched_invoice_id=None,
            confidence_score=0.0,
            match_type="NONE"
        ))

    # Add unmatched bank row (Rule 4)
    bank_rows.append(BankStatementRow(
        id="BST-5004",
        statement_date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
        amount=345000.0,
        payer_name="UNKNOWN TRADERS PRIVATE LTD",
        reference="IMPS-88712399",
        status="UNMATCHED",
        matched_invoice_id=None,
        confidence_score=0.0,
        match_type="NONE"
    ))

    db.add_all(bank_rows)
    db.commit()
    db.close()
    print("Seed data generated successfully!")

if __name__ == "__main__":
    generate_seed_data()
