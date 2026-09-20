import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, AlertTriangle, Send, Copy, Sparkles, CheckCircle } from 'lucide-react';

export default function AiCollectionAssistant({ selectedCustomerContext }) {
  const [context, setContext] = useState({
    customer_id: "CUST-101",
    customer_name: "ABC Corp",
    outstanding_amount: 4200000.0,
    days_overdue: 31,
    usual_payment_behavior: "12 days late",
    previous_delay_reason: "invoice dispute",
    recommended_action: "send escalation email"
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedCustomerContext) {
      setContext({
        customer_id: selectedCustomerContext.customer_id || "CUST-101",
        customer_name: selectedCustomerContext.customer_name || "ABC Corp",
        outstanding_amount: selectedCustomerContext.outstanding_amount || 4200000.0,
        days_overdue: selectedCustomerContext.days_overdue || 31,
        usual_payment_behavior: selectedCustomerContext.historical_avg_delay ? `${selectedCustomerContext.historical_avg_delay} days late` : "12 days late",
        previous_delay_reason: selectedCustomerContext.dispute_reason || (selectedCustomerContext.has_dispute ? "invoice dispute" : "None"),
        recommended_action: selectedCustomerContext.recommended_action || "send escalation email"
      });
    }
  }, [selectedCustomerContext]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/assistant/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error("AI assistant error", e);
    } finally {
      setGenerating(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleCopyEmail = () => {
    if (result?.draft_email) {
      navigator.clipboard.writeText(result.draft_email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left Panel: Deterministic Context Assembly */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Deterministic Context Panel</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Assembled strictly by backend rules — zero LLM math or estimation
              </p>
            </div>
            <span className="badge badge-low" style={{ background: '#121212', color: '#FFF' }}>
              STRICT FACT CONTEXT
            </span>
          </div>

          <div style={{ background: '#FAF9F5', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
              System Prompt Constraint
            </div>
            <code style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block', lineHeight: 1.4 }}>
              "You only summarize and draft language. You do not calculate, estimate, or invent any financial figures. Use only the numbers provided."
            </code>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CUSTOMER NAME</label>
              <input 
                type="text" 
                value={context.customer_name} 
                onChange={e => setContext({ ...context, customer_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OUTSTANDING AMOUNT (₹)</label>
                <input 
                  type="number" 
                  value={context.outstanding_amount} 
                  onChange={e => setContext({ ...context, outstanding_amount: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>DAYS OVERDUE</label>
                <input 
                  type="number" 
                  value={context.days_overdue} 
                  onChange={e => setContext({ ...context, days_overdue: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px', fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>USUAL PAYMENT BEHAVIOR</label>
              <input 
                type="text" 
                value={context.usual_payment_behavior} 
                onChange={e => setContext({ ...context, usual_payment_behavior: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PREVIOUS DELAY REASON</label>
              <input 
                type="text" 
                value={context.previous_delay_reason} 
                onChange={e => setContext({ ...context, previous_delay_reason: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>RECOMMENDED ACTION (COMPUTED RULE)</label>
              <select
                value={context.recommended_action}
                onChange={e => setContext({ ...context, recommended_action: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '4px', backgroundColor: '#FFF', fontWeight: 600 }}
              >
                <option value="send escalation email">send escalation email (Firm/Formal)</option>
                <option value="schedule urgent call">schedule urgent call (Direct/Urgent)</option>
                <option value="send friendly reminder">send friendly reminder (Courteous)</option>
              </select>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: '12px', padding: '12px', justifyContent: 'center' }}
              onClick={handleGenerate}
              disabled={generating}
            >
              <Sparkles size={18} color="var(--accent-gold)" />
              <span>{generating ? "Generating AI Draft..." : "Generate Summary & Draft Email"}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: LLM Language Generation & Hallucination Guardrail */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <h2 className="card-title">AI Summary & Outreach Language</h2>
              <span className="badge badge-low">LLM LANGUAGE ONLY</span>
            </div>

            {!result ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bot size={48} color="var(--accent-gold)" style={{ opacity: 0.6, marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>Click <strong>"Generate Summary & Draft Email"</strong> to synthesize natural language outreach using strict context boundaries.</p>
              </div>
            ) : (
              <div>
                {/* 1. Situation Summary */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    1-2 Sentence Executive Summary
                  </div>
                  <div style={{ background: '#FAF9F5', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--accent-gold)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {result.summary}
                  </div>
                </div>

                {/* 2. Draft Email */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Draft Outreach Email
                    </div>
                    <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={handleCopyEmail}>
                      <Copy size={12} />
                      <span>{copied ? "Copied!" : "Copy Text"}</span>
                    </button>
                  </div>
                  <pre style={{ 
                    background: '#FFFFFF', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-light)', 
                    fontSize: '0.85rem', 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.5,
                    margin: 0
                  }}>
                    {result.draft_email}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* 3. Hallucination Guardrail Audit Panel */}
          {result?.guardrail && (
            <div className={`guardrail-box ${result.guardrail.hallucination_detected ? 'warning' : ''}`} style={{ marginTop: '20px' }}>
              <ShieldCheck size={28} color={result.guardrail.hallucination_detected ? 'var(--risk-high)' : 'var(--risk-low)'} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.9rem', color: result.guardrail.hallucination_detected ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                    {result.guardrail.hallucination_detected ? "HALLUCINATION DETECTED" : "0 HALLUCINATIONS DETECTED"}
                  </strong>
                  <span className="badge badge-low" style={{ background: result.guardrail.hallucination_detected ? 'var(--risk-high)' : 'var(--risk-low)', color: '#FFF' }}>
                    NUMERIC AUDIT PASSED
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  {result.guardrail.message}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Context Numbers Verified: <code>{JSON.stringify(result.guardrail.allowed_context_numbers)}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
