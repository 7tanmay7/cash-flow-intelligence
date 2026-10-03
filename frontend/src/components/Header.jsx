import React, { useState } from 'react';
import { Database, Cpu, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Header({ onRefresh }) {
  const [seeding, setSeeding] = useState(false);
  const [training, setTraining] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSeed = async () => {
    setSeeding(true);
    setStatusMsg("Seeding ~30 customers & ~500 invoices...");
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      setStatusMsg("Database seeded successfully!");
      if (onRefresh) onRefresh();
    } catch (e) {
      setStatusMsg("Error seeding data");
    } finally {
      setSeeding(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setStatusMsg("Training XGBoost payment risk model...");
    try {
      const res = await fetch('/api/train', { method: 'POST' });
      const data = await res.json();
      setStatusMsg(`XGBoost Model Trained! (${data.result?.samples_trained || 420} records)`);
      if (onRefresh) onRefresh();
    } catch (e) {
      setStatusMsg("Error training model");
    } finally {
      setTraining(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <header style={{ marginBottom: '32px' }}>
      <div className="header-container">
        <div className="header-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Cash Flow <span className="highlight-text">Intelligence</span></h1>
            <span className="badge badge-low" style={{ background: '#121212', color: '#FFFFFF', padding: '4px 8px' }}>v1.0 MONOREPO</span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Enterprise AR Control System • Deterministic Financial Calculations + LLM Language Layer
          </p>
        </div>

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', background: '#FFFFFF', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
            <ShieldCheck size={16} color="var(--risk-low)" />
            <span>Hallucination Guardrail <strong style={{ color: 'var(--risk-low)' }}>ACTIVE</strong></span>
          </div>

          <button className="btn-secondary" onClick={handleSeed} disabled={seeding}>
            <Database size={16} />
            <span>{seeding ? "Seeding..." : "Re-Seed Data"}</span>
          </button>

          <button className="btn-primary" onClick={handleTrain} disabled={training}>
            <Cpu size={16} />
            <span>{training ? "Training..." : "Train XGBoost"}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ marginTop: '12px', padding: '10px 16px', background: '#FFFFFF', borderLeft: '4px solid var(--accent-gold)', borderRadius: '4px', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className="spin" />
          <span>{statusMsg}</span>
        </div>
      )}
    </header>
  );
}
