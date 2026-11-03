import React from 'react';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

export default function Reports() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Budget Reports & Analytics 📊
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Visual insights into spending habits, savings rate, and reserve health.
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div className="brand-icon-box" style={{ margin: '0 auto 16px auto', background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <BarChart3 size={24} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          Reports & Visualizations Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Monthly spending breakdowns, savings vs goal trajectories, and reserve wallet utilization analytics will be available in later phases.
        </p>
      </div>
    </div>
  );
}

