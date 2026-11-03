import React from 'react';
import { Receipt, Plus } from 'lucide-react';

export default function Expenses() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Daily Expenses
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Log, categorize, and monitor day-to-day spending.
          </p>
        </div>

        <button className="btn btn-primary" disabled style={{ opacity: 0.7 }}>
          <Plus size={18} />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div className="brand-icon-box" style={{ margin: '0 auto 16px auto', background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <Receipt size={24} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          Expenses Engine Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
          In the upcoming phase, daily expense logging, chronological reserve recalculation, and category breakdowns will be implemented here.
        </p>
      </div>
    </div>
  );
}

