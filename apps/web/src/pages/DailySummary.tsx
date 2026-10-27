import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button, Card, useToast, Skeleton } from '../components/ui/index.js';
import { apiRequest } from '../api/client.js';

interface DailySummaryData {
  hasBudget: boolean;
  targetDate: string;
  dailyMetrics: {
    spentPaise: number;
    limitPaise: number;
    bankedPaise: number;
    reservoirUsedPaise: number;
    reservoirBalancePaise: number;
    shortfallPaise: number;
    cumulativeShortfallPaise: number;
    projectedSavingsPaise: number;
  } | null;
  monthMetrics: {
    remainingSpendingBudgetPaise: number;
    originalSavingsGoalPaise: number;
  } | null;
  insight: string | null;
  deliveryStatus: string;
  lastError: string | null;
}

interface DeliveryHistoryItem {
  id: string;
  reportDate: string;
  status: string;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
}

export const DailySummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const selectedDateParam = searchParams.get('date');

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<DailySummaryData | null>(null);

  // Load History list and active day summary
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const historyRes = await apiRequest<{ history: DeliveryHistoryItem[] }>('/api/notifications/history');
        if (!mounted) return;
        setHistory(historyRes.history);

        // Fetch daily summary for selected date (or today)
        const dateQuery = selectedDateParam ? `?date=${selectedDateParam}` : '';
        const summaryRes = await apiRequest<DailySummaryData>(`/api/notifications/daily-summary${dateQuery}`);
        if (!mounted) return;
        setSelectedSummary(summaryRes);
      } catch (err: any) {
        showToast(err.message || 'Failed to load summary data', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [selectedDateParam, showToast]);

  const formatRupees = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={13} /> Email Sent
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>
            <XCircle size={13} /> Email Failed
          </span>
        );
      case 'skipped':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
            <Clock size={13} /> Skipped
          </span>
        );
      case 'queued':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
            <Clock size={13} /> Queued
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.75rem' }}>
            In-App Only
          </span>
        );
    }
  };

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.25rem 1rem 3rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/home')}>
          Back
        </Button>
        <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>Daily Budget Summaries</h1>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton height="3rem" width="100%" />
          <Skeleton height="8rem" width="100%" />
          <Skeleton height="4rem" width="100%" />
        </div>
      ) : selectedSummary && selectedSummary.dailyMetrics ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Summary Card */}
          <Card
            variant="glass"
            style={{
              background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                  Report for {selectedSummary.targetDate}
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Daily Wrap-Up
                </div>
              </div>
              <div>{getStatusBadge(selectedSummary.deliveryStatus)}</div>
            </div>

            {/* If email delivery failed, show notice without hiding the numbers */}
            {selectedSummary.deliveryStatus === 'failed' && (
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.75rem',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertTriangle size={14} />
                <span>Email was not delivered ({selectedSummary.lastError || 'Network issue'}). In-app data is complete.</span>
              </div>
            )}

            {/* Daily Insight Box */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                lineHeight: 1.45,
                borderLeft: '3px solid var(--color-primary)'
              }}
            >
              {selectedSummary.insight}
            </div>

            {/* Metric Row Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Spent Today</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {formatRupees(selectedSummary.dailyMetrics.spentPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Daily Spending Limit</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  {formatRupees(selectedSummary.dailyMetrics.limitPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Reservoir Movement</div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color:
                      selectedSummary.dailyMetrics.bankedPaise > 0
                        ? 'var(--color-primary)'
                        : selectedSummary.dailyMetrics.reservoirUsedPaise > 0
                        ? '#f59e0b'
                        : 'var(--color-text-muted)'
                  }}
                >
                  {selectedSummary.dailyMetrics.bankedPaise > 0
                    ? `+${formatRupees(selectedSummary.dailyMetrics.bankedPaise)}`
                    : selectedSummary.dailyMetrics.reservoirUsedPaise > 0
                    ? `-${formatRupees(selectedSummary.dailyMetrics.reservoirUsedPaise)}`
                    : '₹0'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Reservoir Balance</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatRupees(selectedSummary.dailyMetrics.reservoirBalancePaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Protected Savings</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatRupees(selectedSummary.monthMetrics?.originalSavingsGoalPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Projected Savings</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                  {formatRupees(selectedSummary.dailyMetrics.projectedSavingsPaise)}
                </div>
              </div>
            </div>
          </Card>

          {/* Previous Days List */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem', color: 'var(--color-text-primary)' }}>
              Previous Days
            </h3>

            {history.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                No past daily summaries logged yet. They will appear here automatically every evening.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map((item) => (
                  <Card
                    key={item.id}
                    variant="solid"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1rem'
                    }}
                    onClick={() => setSearchParams({ date: item.reportDate })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={18} color="var(--color-text-muted)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.reportDate}</div>
                        <div style={{ fontSize: '0.75rem' }}>{getStatusBadge(item.status)}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--color-text-muted)" />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Please complete your initial monthly onboarding to view daily budget summaries.
        </p>
      )}
    </div>
  );
};
