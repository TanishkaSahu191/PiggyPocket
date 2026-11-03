import React from 'react';
import { History as HistoryIcon, Calendar } from 'lucide-react';

export default function History() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Monthly History
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Archive of past months' spending, reserve balances, and saved goals.
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div className="brand-icon-box" style={{ margin: '0 auto 16px auto', background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <HistoryIcon size={24} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          Archive History Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Per the core rules: previous months are never erased, and late expenses update their respective monthly records. History tracking will be hooked up in future phases.
        </p>
      </div>
    </div>
  );
}

