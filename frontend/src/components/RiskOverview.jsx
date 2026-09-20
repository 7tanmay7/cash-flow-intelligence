import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingUp, CheckCircle, Search, Info } from 'lucide-react';

export default function RiskOverview({ data, loading, onSelectCustomer }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');

  if (loading) {
    return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Loading payment risk predictions...</div>;
  }

  const metrics = data?.metrics || {
    total_open_invoices: 0,
    total_outstanding_amount: 0,
    high_risk_amount: 0,
    high_risk_percentage: 0,
    risk_distribution: { HIGH: 0, MEDIUM: 0, LOW: 0 }
  };

  const featureImportances = data?.feature_importances || [];
  const invoices = data?.invoices || [];

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || inv.risk_label === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Recharts data format for risk distribution
  const riskChartData = [
    { name: 'HIGH Risk', count: metrics.risk_distribution.HIGH, color: '#B5443A' },
    { name: 'MEDIUM Risk', count: metrics.risk_distribution.MEDIUM, color: '#C5A059' },
    { name: 'LOW Risk', count: metrics.risk_distribution.LOW, color: '#4C6B4F' }
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Outstanding AR</div>
          <div className="kpi-value tabular-nums">{formatINR(metrics.total_outstanding_amount)}</div>
          <div className="kpi-subtext">{metrics.total_open_invoices} Open & Overdue Invoices</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">High Risk Exposure</div>
          <div className="kpi-value tabular-nums" style={{ color: 'var(--risk-high)' }}>
            {formatINR(metrics.high_risk_amount)}
          </div>
          <div className="kpi-subtext" style={{ color: 'var(--risk-high)', fontWeight: 600 }}>
            {metrics.high_risk_percentage}% of Total Portfolio
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Risk Distribution</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span className="badge badge-high">{metrics.risk_distribution.HIGH} High</span>
            <span className="badge badge-medium">{metrics.risk_distribution.MEDIUM} Med</span>
            <span className="badge badge-low">{metrics.risk_distribution.LOW} Low</span>
          </div>
          <div className="kpi-subtext">XGBoost Classification Output</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">ML Model Engine</div>
          <div className="kpi-value" style={{ fontSize: '1.2rem', marginTop: '4px' }}>XGBoost Regressor</div>
          <div className="kpi-subtext">Trained on 420+ historical payments</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Risk Distribution Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Risk Distribution</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Invoices by XGBoost Risk Level</span>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} />
                <YAxis tick={{ fontSize: 12, fill: '#666' }} />
                <Tooltip 
                  formatter={(val) => [`${val} Invoices`, 'Count']}
                  contentStyle={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explainable ML: Feature Importance Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">XGBoost Feature Importance</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>AUDITABLE EXPLAINABILITY</span>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={featureImportances} margin={{ top: 10, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: '#121212' }} />
                <Tooltip 
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Weight']}
                  contentStyle={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px' }}
                />
                <Bar dataKey="importance" fill="#C5A059" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Predictions Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="card-title">Payment Risk Predictions (Open Invoices)</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Deterministic ML Scoring Engine • Predicts expected payment delay & late probability per invoice
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search customer or invoice..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.85rem',
                  width: '220px'
                }}
              />
            </div>

            {/* Filter */}
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
                backgroundColor: '#FFF'
              }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">HIGH Risk Only</option>
              <option value="MEDIUM">MEDIUM Risk Only</option>
              <option value="LOW">LOW Risk Only</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer Name</th>
                <th>Amount (₹)</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Predicted Pay Days</th>
                <th>Late Probability</th>
                <th>Risk Label</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.slice(0, 25).map((inv) => {
                const isAbcExample = inv.invoice_number === "INV-8232";
                return (
                  <tr key={inv.invoice_id} style={isAbcExample ? { backgroundColor: '#FFFDF5' } : {}}>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{inv.invoice_number}</strong>
                      {isAbcExample && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 700 }}>(PROMPT REPLICATE)</span>}
                    </td>
                    <td><strong>{inv.customer_name}</strong></td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>{formatINR(inv.amount)}</td>
                    <td>{inv.due_date}</td>
                    <td>
                      <span className={`badge ${inv.status === 'OVERDUE' ? 'badge-high' : 'badge-neutral'}`}>
                        {inv.status}
                      </span>
                      {inv.dispute_flag && <span style={{ marginLeft: '6px', color: 'var(--risk-high)', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ DISPUTE</span>}
                    </td>
                    <td className="tabular-nums">{inv.expected_payment_days} days</td>
                    <td className="tabular-nums">
                      <strong style={{ color: inv.late_probability >= 0.7 ? 'var(--risk-high)' : 'var(--text-main)' }}>
                        {(inv.late_probability * 100).toFixed(0)}%
                      </strong>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.risk_label.toLowerCase()}`}>
                        {inv.risk_label}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={() => onSelectCustomer && onSelectCustomer(inv.customer_id)}
                      >
                        Collections AI →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
