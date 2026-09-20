from database import SessionLocal
from models import Invoice, PaymentPrediction
from ml_model import train_and_save_models, predict_invoice_risk

def run_training_pipeline():
    db = SessionLocal()
    try:
        print("Training XGBoost payment prediction model...")
        res = train_and_save_models(db)
        print(f"Training completed! Trained on {res['samples_trained']} historical records.")

        print("Scoring open and overdue invoices...")
        open_invoices = db.query(Invoice).filter(Invoice.status.in_(["OPEN", "OVERDUE"])).all()

        for inv in open_invoices:
            pred_dict = predict_invoice_risk(inv, inv.customer)
            
            existing = db.query(PaymentPrediction).filter(PaymentPrediction.invoice_id == inv.id).first()
            if existing:
                existing.expected_payment_days = pred_dict["expected_payment_days"]
                existing.late_probability = pred_dict["late_probability"]
                existing.risk_label = pred_dict["risk_label"]
            else:
                new_pred = PaymentPrediction(
                    invoice_id=inv.id,
                    expected_payment_days=pred_dict["expected_payment_days"],
                    late_probability=pred_dict["late_probability"],
                    risk_label=pred_dict["risk_label"]
                )
                db.add(new_pred)

        db.commit()
        print(f"Successfully scored {len(open_invoices)} invoices.")
        return res
    finally:
        db.close()

if __name__ == "__main__":
    run_training_pipeline()
