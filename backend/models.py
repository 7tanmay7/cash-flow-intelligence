from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=False)
    payment_terms_days = Column(Integer, default=30)
    historical_avg_delay = Column(Float, default=0.0) # avg days paid after due date
    credit_limit = Column(Float, default=5000000.0)
    total_outstanding = Column(Float, default=0.0)

    invoices = relationship("Invoice", back_populates="customer")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False) # In INR (₹)
    outstanding_amount = Column(Float, nullable=False)
    issue_date = Column(String, nullable=False) # YYYY-MM-DD
    due_date = Column(String, nullable=False)   # YYYY-MM-DD
    status = Column(String, nullable=False, default="OPEN") # OPEN, PAID, OVERDUE
    dispute_flag = Column(Boolean, default=False)
    dispute_reason = Column(String, nullable=True)

    customer = relationship("Customer", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")
    prediction = relationship("PaymentPrediction", back_populates="invoice", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    payment_date = Column(String, nullable=False)
    payment_reference = Column(String, nullable=False)
    days_to_pay = Column(Integer, nullable=False) # actual days taken from issue_date to payment

    invoice = relationship("Invoice", back_populates="payments")


class PaymentPrediction(Base):
    __tablename__ = "payment_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False, unique=True)
    expected_payment_days = Column(Integer, nullable=False) # total days from issue_date
    late_probability = Column(Float, nullable=False) # 0.0 to 1.0 (78% = 0.78)
    risk_label = Column(String, nullable=False) # LOW, MEDIUM, HIGH
    predicted_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="prediction")


class BankStatementRow(Base):
    __tablename__ = "bank_statement_rows"

    id = Column(String, primary_key=True, index=True)
    statement_date = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    payer_name = Column(String, nullable=False)
    reference = Column(String, nullable=False)
    status = Column(String, default="UNMATCHED") # MATCHED, UNMATCHED
    matched_invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    confidence_score = Column(Float, default=0.0) # 0 to 100
    match_type = Column(String, default="NONE") # EXACT_REFERENCE, AMOUNT_CUSTOMER_FUZZY, AMOUNT_DATE_WINDOW, MANUAL
