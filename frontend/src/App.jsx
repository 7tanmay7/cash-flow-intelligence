import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RiskOverview from './components/RiskOverview';
import CollectionsPriorityQueue from './components/CollectionsPriorityQueue';
import AiCollectionAssistant from './components/AiCollectionAssistant';
import CashApplication from './components/CashApplication';

export default function App() {
  const [activeTab, setActiveTab] = useState('risk');
  const [riskData, setRiskData] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [selectedCustomerForAssistant, setSelectedCustomerForAssistant] = useState(null);

  const fetchRiskSummary = async () => {
    setLoadingRisk(true);
    try {
      const res = await fetch('/api/risk/summary');
      const data = await res.json();
      setRiskData(data);
    } catch (e) {
      console.error("Failed to load risk summary", e);
    } finally {
      setLoadingRisk(false);
    }
  };

  useEffect(() => {
    fetchRiskSummary();
  }, []);

  const handleLaunchAssistant = (customerContext) => {
    setSelectedCustomerForAssistant(customerContext);
    setActiveTab('assistant');
  };

  return (
    <div className="app-container">
      <Header onRefresh={fetchRiskSummary} />

      {/* Primary Module Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('risk')}
        >
          1. Payment Risk (XGBoost)
        </button>

        <button 
          className={`nav-tab ${activeTab === 'priority' ? 'active' : ''}`}
          onClick={() => setActiveTab('priority')}
        >
          2. Collections Priority Queue
        </button>

        <button 
          className={`nav-tab ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          3. AI Collections Assistant
        </button>

        <button 
          className={`nav-tab ${activeTab === 'cash-app' ? 'active' : ''}`}
          onClick={() => setActiveTab('cash-app')}
        >
          4. Cash Application Engine
        </button>
      </nav>

      {/* Main Tab Panels */}
      <main>
        {activeTab === 'risk' && (
          <RiskOverview 
            data={riskData} 
            loading={loadingRisk} 
            onSelectCustomer={(cust_id) => handleLaunchAssistant({ customer_id: cust_id })} 
          />
        )}

        {activeTab === 'priority' && (
          <CollectionsPriorityQueue 
            onLaunchAssistant={handleLaunchAssistant} 
          />
        )}

        {activeTab === 'assistant' && (
          <AiCollectionAssistant 
            selectedCustomerContext={selectedCustomerForAssistant} 
          />
        )}

        {activeTab === 'cash-app' && (
          <CashApplication />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <p style={{ margin: 0 }}>
          Cash Flow Intelligence • Deterministic Order-to-Cash Decision Engine • Built with FastAPI, XGBoost, and React
        </p>
      </footer>
    </div>
  );
}
