import React, { useState, useEffect } from 'react';
import { ArrowUpDown, AlertCircle, Bot, Sliders, CheckCircle2 } from 'lucide-react';

export default function CollectionsPriorityQueue({ onLaunchAssistant }) {
  const [worklist, setWorklist] = useState([]);
  const [disputePenalty, setDisputePenalty] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPriorityQueue = async (penalty) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/priority?dispute_penalty=${penalty}`);
      const data = await res.json();
      setWorklist(data.worklist || []);
    } catch (e) {
      console.error("Failed to load collections priority queue", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorityQueue(disputePenalty);
  }, [disputePenalty]);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredWorklist = worklist.filter(item => 
    item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="card-title">Collections Priority Queue</h2>
            <span className="badge badge-low" style={{ background: '#121212', color: '#FFF' }}>
              PURE FORMULA • PURE DETERMINISTIC
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            formula: <code>Priority = Outstanding Amount × Late Probability × Days Outstanding (× 1.25 if Dispute)</code>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Dispute Penalty Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={disputePenalty} 
              onChange={e => setDisputePenalty(e.target.checked)} 
              style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
            />
            <span>Dispute Penalty Multiplier (1.25x)</span>
          </label>

          <input 
            type="text"
            placeholder="Search customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem',
              width: '200px'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Calculating deterministic priority scores...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Customer</th>
                <th>Outstanding (₹)</th>
                <th>Late Prob</th>
                <th>Days Overdue</th>
                <th>Dispute Status</th>
                <th>Priority Score</th>
                <th>Recommended Action</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorklist.map((item) => {
                const isAbc = item.customer_id === "CUST-101";
                const isXyz = item.customer_id === "CUST-102";

                return (
                  <tr key={item.customer_id} style={isAbc ? { backgroundColor: '#FFFDF5' } : {}}>
                    <td>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: item.rank === 1 ? 'var(--accent-gold)' : item.rank <= 3 ? '#121212' : '#E5E5E5',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {item.rank}
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }}>{item.customer_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.industry} • {item.invoice_count} Invoice(s)</div>
                    </td>
                    <td className="tabular-nums" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {formatINR(item.outstanding_amount)}
                    </td>
                    <td className="tabular-nums">
                      <strong style={{ color: item.late_probability >= 0.75 ? 'var(--risk-high)' : 'var(--text-main)' }}>
                        {(item.late_probability * 100).toFixed(0)}%
                      </strong>
                    </td>
                    <td className="tabular-nums">{item.days_overdue} days</td>
                    <td>
                      {item.has_dispute ? (
                        <span className="badge badge-high" title={item.dispute_reason}>
                          ⚠️ DISPUTE (1.25x)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                    <td className="tabular-nums">
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {item.priority_score.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 600, 
                        color: item.recommended_action.includes('escalation') ? 'var(--risk-high)' : 'var(--text-main)' 
                      }}>
                        {item.recommended_action}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => onLaunchAssistant && onLaunchAssistant(item)}
                      >
                        <Bot size={14} />
                        <span>AI Assistant</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
