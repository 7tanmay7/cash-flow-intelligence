import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Link, ArrowRight, UserCheck } from 'lucide-react';

export default function CashApplication() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnmatched, setSelectedUnmatched] = useState(null);
  const [resolveInvoiceId, setResolveInvoiceId] = useState('INV-8232');
  const [resolving, setResolving] = useState(false);

  const handleRunMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cash-application/match', { method: 'POST' });
      const resData = await res.json();
      setData(resData);
    } catch (e) {
      console.error("Cash app error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunMatch();
  }, []);

  const handleManualResolve = async () => {
    if (!selectedUnmatched) return;
    setResolving(true);
    try {
      await fetch('/api/cash-application/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_statement_id: selectedUnmatched.bank_statement_id,
          invoice_id: resolveInvoiceId
        })
      });
      setSelectedUnmatched(null);
      handleRunMatch();
    } catch (e) {
      console.error("Manual resolve error", e);
    } finally {
      setResolving(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="card-title">Cash Application & Rule Matching Engine</h2>
              <span className="badge badge-low" style={{ background: '#121212', color: '#FFF' }}>
                RULE HIERARCHY ENGINE
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Priority Rules: 1. Exact Ref (99%) → 2. Amount + Customer Name Fuzzy (90%) → 3. Amount + Date Window (75%) → 4. Manual Review
            </p>
          </div>

          <button className="btn-primary" onClick={handleRunMatch} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>{loading ? "Matching..." : "Run Cash Application Match"}</span>
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div style={{ display: 'flex', gap: '24px', background: '#FAF9F5', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL STATEMENT ROWS</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{data.total_processed}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '24px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--risk-low)', fontWeight: 600 }}>AUTO-MATCHED</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--risk-low)' }}>{data.total_matched}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '24px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--risk-high)', fontWeight: 600 }}>UNMATCHED (MANUAL REVIEW)</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--risk-high)' }}>{data.total_unmatched}</div>
            </div>
          </div>
        )}
      </div>

      {/* Matched Transactions Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ fontSize: '1.15rem' }}>Matched Bank Transactions (High Confidence)</h2>
          <span className="badge badge-low">CONFIDENCE &gt; 70%</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Statement Date</th>
                <th>Bank Reference</th>
                <th>Payer Name</th>
                <th>Received Amount (₹)</th>
                <th>Matched Invoice</th>
                <th>Confidence</th>
                <th>Rule Type</th>
                <th>Rule Explanation</th>
              </tr>
            </thead>
            <tbody>
              {data?.matched?.map((item) => {
                const isAxReplicate = item.reference === "NEFT-AX29183";
                return (
                  <tr key={item.bank_statement_id} style={isAxReplicate ? { backgroundColor: '#FFFDF5' } : {}}>
                    <td>{item.statement_date}</td>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{item.reference}</strong>
                      {isAxReplicate && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 700 }}>(PROMPT REPLICATE)</span>}
                    </td>
                    <td><strong>{item.payer_name}</strong></td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>{formatINR(item.amount)}</td>
                    <td>
                      <strong style={{ color: 'var(--risk-low)' }}>{item.matched_invoice_id}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.customer_name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '42px',
                          height: '24px',
                          borderRadius: '12px',
                          background: item.confidence_score >= 90 ? '#E2F0E4' : '#FFF3D6',
                          color: item.confidence_score >= 90 ? 'var(--risk-low)' : 'var(--risk-medium)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.confidence_score}%
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {item.match_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.explanation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmatched Transactions Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ fontSize: '1.15rem', color: 'var(--risk-high)' }}>
            Unmatched Bucket (Requires Manual Resolution)
          </h2>
          <span className="badge badge-high">MANUAL ACTION REQUIRED</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Statement Date</th>
                <th>Bank Reference</th>
                <th>Payer Name</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Explanation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.unmatched?.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    All bank statement transactions have been matched!
                  </td>
                </tr>
              ) : (
                data?.unmatched?.map((item) => (
                  <tr key={item.bank_statement_id}>
                    <td>{item.statement_date}</td>
                    <td><strong style={{ fontFamily: 'monospace' }}>{item.reference}</strong></td>
                    <td><strong>{item.payer_name}</strong></td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>{formatINR(item.amount)}</td>
                    <td><span className="badge badge-high">UNMATCHED</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.explanation}</td>
                    <td>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => setSelectedUnmatched(item)}
                      >
                        <UserCheck size={14} />
                        <span>Resolve Manually</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Resolution Modal */}
      {selectedUnmatched && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '90%' }}>
            <h2 className="card-title" style={{ marginBottom: '12px' }}>Manual Cash Resolution</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Assigning bank receipt <strong>{selectedUnmatched.reference}</strong> ({formatINR(selectedUnmatched.amount)}) from <strong>{selectedUnmatched.payer_name}</strong>.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>SELECT OPEN INVOICE TO MATCH</label>
              <select 
                value={resolveInvoiceId}
                onChange={e => setResolveInvoiceId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '6px', fontSize: '0.9rem', backgroundColor: '#FFF' }}
              >
                <option value="INV-8232">INV-8232 (ABC Corp - ₹12,50,000)</option>
                <option value="INV-8233">INV-8233 (ABC Corp - ₹20,77,600)</option>
                <option value="INV-8240">INV-8240 (XYZ Ltd - ₹18,00,000)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setSelectedUnmatched(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleManualResolve} disabled={resolving}>
                {resolving ? "Saving Match..." : "Confirm 100% Match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
