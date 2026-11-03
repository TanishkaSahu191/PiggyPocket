import React from 'react';
import { Wallet, RotateCcw, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useBudget } from '../../context/BudgetContext';
import { formatMonthName } from '../../services/storage';

export function NewMonthRolloverDialog() {
  const { rolloverDialog, handleRolloverChoice } = useBudget();

  if (!rolloverDialog.isOpen) return null;

  const prevMonthLabel = formatMonthName(rolloverDialog.previousMonth);
  const newMonthLabel = formatMonthName(rolloverDialog.newMonth);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '30px',
          border: '2px solid var(--wallet-border)',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--wallet-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <Wallet size={22} />
          </div>
          <div>
            <span className="badge badge-wallet">Month Rollover</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
              New Month: {newMonthLabel}
            </h3>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px' }}>
          You completed <strong>{prevMonthLabel}</strong> with a remaining balance of{' '}
          <strong style={{ color: 'var(--wallet-primary)' }}>INR {rolloverDialog.previousReserve}</strong> in your virtual Reserve Wallet.
        </p>

        <div style={{ background: 'var(--wallet-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--wallet-border)', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wallet-primary)', marginBottom: '6px' }}>
            What would you like to do with this balance?
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Carrying forward brings your saved surplus into {newMonthLabel} to cushion future overspending. Resetting starts your Reserve Wallet clean at INR 0. Your decision and previous balance will be archived in {prevMonthLabel}'s record.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleRolloverChoice(true)}
            className="btn btn-primary"
            style={{ width: '100%', backgroundColor: 'var(--wallet-primary)' }}
          >
            <Wallet size={16} />
            <span>Carry Forward (INR {rolloverDialog.previousReserve})</span>
          </button>

          <button
            type="button"
            onClick={() => handleRolloverChoice(false)}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            <RotateCcw size={16} />
            <span>Reset Reserve Wallet to INR 0</span>
          </button>
        </div>
      </div>
    </div>
  );
}

