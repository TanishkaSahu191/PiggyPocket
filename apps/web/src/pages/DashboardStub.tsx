import React from 'react';
import { PiggyBank } from 'lucide-react';
import { EmptyState } from '../components/ui/index.js';

export const DashboardStub: React.FC = () => {
  return (
    <div className="mobile-view-wrapper" style={{ padding: '2rem 1.5rem' }}>
      <EmptyState
        icon={<PiggyBank size={32} />}
        title="No Active Budget Set Up"
        description="Set up your monthly pocket money and savings goal to unlock your daily spending limit. (Available in Phase 4)"
      />
    </div>
  );
};
