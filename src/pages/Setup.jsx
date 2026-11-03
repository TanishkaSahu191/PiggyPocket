import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ArrowRight, ShieldCheck, Sparkles, PiggyBank } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Setup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Monthly Budget Setup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Configure pocket money, savings target, and daily spending limit.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div className="brand-icon-box" style={{ width: '40px', height: '40px' }}>
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Phase 1 Setup Placeholder</h3>
            <span className="badge badge-mock">Coming in Next Phase</span>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
          In the upcoming phase, you will configure:
        </p>

        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '24px' }}>
          <li><strong>Monthly Pocket Money:</strong> Total money received from parents/stipend.</li>
          <li><strong>Date Received:</strong> Day of month the pocket money arrives.</li>
          <li><strong>Original Savings Goal:</strong> Locked target you plan to save.</li>
          <li><strong>Custom Daily Spending Limit:</strong> Default is automatically calculated as (Pocket Money - Savings Goal) ÷ days in month.</li>
        </ul>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Go to Dashboard
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

