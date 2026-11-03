import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Info,
  Calendar,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

export default function Setup() {
  const navigate = useNavigate();
  const {
    budgetConfig,
    updateBudgetConfig,
    spendingBudget,
    defaultDailyLimit,
    effectiveDailyLimit,
    daysInSelectedMonth,
    selectedMonth,
    setSelectedMonth
  } = useBudget();

  const [formState, setFormState] = useState({
    pocketMoney: budgetConfig.pocketMoney,
    dateReceived: budgetConfig.dateReceived,
    savingsGoal: budgetConfig.savingsGoal,
    customDailyLimit: budgetConfig.customDailyLimit,
    isCustomLimit: budgetConfig.isCustomLimit,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live preview computations based on current form inputs
  const previewPocketMoney = Math.max(0, Number(formState.pocketMoney) || 0);
  const previewSavingsGoal = Math.max(0, Number(formState.savingsGoal) || 0);
  const previewSpendingBudget = Math.max(0, previewPocketMoney - previewSavingsGoal);
  const previewDefaultDailyLimit = daysInSelectedMonth > 0
    ? Number((previewSpendingBudget / daysInSelectedMonth).toFixed(2))
    : 0;

  const previewEffectiveLimit = formState.isCustomLimit && formState.customDailyLimit !== null
    ? Math.max(0, Number(formState.customDailyLimit) || 0)
    : previewDefaultDailyLimit;

  const handleChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSavedSuccess(false);
  };

  const handleUseDefaultLimit = () => {
    setFormState((prev) => ({
      ...prev,
      customDailyLimit: previewDefaultDailyLimit,
      isCustomLimit: false,
    }));
    setSavedSuccess(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateBudgetConfig({
      pocketMoney: previewPocketMoney,
      dateReceived: Math.max(1, Math.min(31, Number(formState.dateReceived) || 1)),
      savingsGoal: previewSavingsGoal,
      customDailyLimit: formState.isCustomLimit ? Number(formState.customDailyLimit) : previewDefaultDailyLimit,
      isCustomLimit: formState.isCustomLimit,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
          Monthly Budget Setup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Configure your monthly pocket money, savings goal, and daily spending discipline.
        </p>
      </div>

      {savedSuccess && (
        <div className="alert-box alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>Budget configuration saved successfully. Redirecting to Dashboard...</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Form Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} color="var(--primary)" />
            <span>Budget Parameters</span>
          </h3>

          <form onSubmit={handleSave}>
            {/* Target Month */}
            <div className="form-group">
              <label className="form-label" htmlFor="monthSelect">Target Cycle Month</label>
              <div className="input-wrapper">
                <input
                  id="monthSelect"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input-field no-icon"
                />
              </div>
            </div>

            {/* Monthly Pocket Money */}
            <div className="form-group">
              <label className="form-label" htmlFor="pocketMoney">Monthly Pocket Money (INR)</label>
              <div className="input-wrapper">
                <IndianRupee size={18} className="input-icon" />
                <input
                  id="pocketMoney"
                  type="number"
                  min="0"
                  step="50"
                  value={formState.pocketMoney}
                  onChange={(e) => handleChange('pocketMoney', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 5000"
                  required
                />
              </div>
            </div>

            {/* Date Received */}
            <div className="form-group">
              <label className="form-label" htmlFor="dateReceived">
                Date Pocket Money Received (Day 1 - 31)
              </label>
              <div className="input-wrapper">
                <Calendar size={18} className="input-icon" />
                <input
                  id="dateReceived"
                  type="number"
                  min="1"
                  max="31"
                  value={formState.dateReceived}
                  onChange={(e) => handleChange('dateReceived', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1 (1st of month)"
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                If received on the 5th, your budget cycle runs from the 5th to the 4th of next month.
              </span>
            </div>

            {/* Original Savings Goal */}
            <div className="form-group">
              <label className="form-label" htmlFor="savingsGoal">
                Original Savings Goal (INR)
              </label>
              <div className="input-wrapper">
                <IndianRupee size={18} className="input-icon" />
                <input
                  id="savingsGoal"
                  type="number"
                  min="0"
                  step="50"
                  value={formState.savingsGoal}
                  onChange={(e) => handleChange('savingsGoal', e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Locked baseline goal. This value is never overwritten.
              </span>
            </div>

            {/* Daily Limit */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="dailyLimit">Daily Spending Limit (INR)</label>
                <button
                  type="button"
                  onClick={handleUseDefaultLimit}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Use Default</span>
                </button>
              </div>

              <div className="input-wrapper">
                <IndianRupee size={18} className="input-icon" />
                <input
                  id="dailyLimit"
                  type="number"
                  min="0"
                  step="10"
                  value={formState.customDailyLimit ?? previewDefaultDailyLimit}
                  onChange={(e) => {
                    handleChange('customDailyLimit', e.target.value);
                    handleChange('isCustomLimit', true);
                  }}
                  className="input-field"
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Auto-calculated default is INR {previewDefaultDailyLimit}/day. You can customize it.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '16px' }}>
              <span>Save Budget Configuration</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Live Calculation Preview Card */}
        <div>
          <div className="card" style={{ background: '#f8fafc', border: '1.5px dashed var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
              Live Calculation Preview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pocket Money</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>INR {previewPocketMoney}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--savings-primary)', fontWeight: 600 }}>Original Savings Goal</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--savings-primary)' }}>INR {previewSavingsGoal}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Initial Monthly Spending Budget</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                  INR {previewSpendingBudget}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Days in Cycle ({selectedMonth})</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{daysInSelectedMonth} days</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Calculated Default Daily Limit</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>INR {previewDefaultDailyLimit}/day</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Effective Daily Limit</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  INR {previewEffectiveLimit}/day
                </span>
              </div>
            </div>

            <div className="alert-box alert-info" style={{ marginTop: '20px', marginBottom: 0 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                Formula: Spending Budget = Pocket Money (INR {previewPocketMoney}) - Savings Goal (INR {previewSavingsGoal}) = INR {previewSpendingBudget}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
