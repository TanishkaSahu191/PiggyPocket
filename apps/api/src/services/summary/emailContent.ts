import {
  computeDailySummary,
  computeMonthSummary,
  MonthBudgetInput,
  DailySummaryOutput,
  MonthSummaryOutput
} from '@smart-budget-tracker/shared';

export interface EmailSummaryData {
  user: {
    name: string;
    email: string;
    timezone: string;
  };
  budgetInput: MonthBudgetInput;
  targetDate: string; // YYYY-MM-DD
}

export interface GeneratedEmailSummary {
  subject: string;
  text: string;
  html: string;
  dailyMetrics: DailySummaryOutput;
  monthMetrics: MonthSummaryOutput;
  insight: string;
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  if (Number.isInteger(rupees)) {
    return `₹${rupees.toLocaleString('en-IN')}`;
  }
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateDailyInsight(daily: DailySummaryOutput): string {
  const {
    spentPaise,
    limitPaise,
    bankedPaise,
    reservoirUsedPaise,
    shortfallPaise,
    projectedSavingsPaise
  } = daily;

  if (spentPaise === 0) {
    return `Zero spend today! Full daily limit of ${formatRupees(limitPaise)} moved into your reservoir.`;
  }

  if (spentPaise < limitPaise) {
    const underLimitPaise = limitPaise - spentPaise;
    return `You spent ${formatRupees(underLimitPaise)} less than your limit, so ${formatRupees(
      bankedPaise
    )} moved into your reservoir.`;
  }

  if (spentPaise === limitPaise) {
    return `You spent exactly your daily limit today. Your reservoir balance and savings goal remain steady.`;
  }

  // Spent > Limit (Overspending occurred)
  const overspendPaise = spentPaise - limitPaise;

  if (shortfallPaise === 0 && reservoirUsedPaise > 0) {
    return `You went ${formatRupees(
      overspendPaise
    )} over; your reservoir covered all of it, keeping your savings goal on track at ${formatRupees(
      projectedSavingsPaise
    )}.`;
  }

  return `You went ${formatRupees(overspendPaise)} over; the reservoir covered ${formatRupees(
    reservoirUsedPaise
  )} and ${formatRupees(shortfallPaise)} was not covered, so your projected savings are now ${formatRupees(
    projectedSavingsPaise
  )}.`;
}

export function buildDailyEmailSummary(data: EmailSummaryData): GeneratedEmailSummary {
  const { user, budgetInput, targetDate } = data;

  const daily = computeDailySummary(budgetInput, targetDate);
  const month = computeMonthSummary(budgetInput, targetDate);

  const insight = generateDailyInsight(daily);

  const dateObj = new Date(`${targetDate}T12:00:00Z`);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const subject = `PiggyPocket Daily Summary: ${formattedDate} · ${daily.shortfallPaise > 0 ? '⚠️ Budget Update' : '✨ On Track'}`;

  // Plain-Text Version
  const text = `
PiggyPocket Daily Budget Summary
---------------------------------------------
Date: ${formattedDate}
Hi ${user.name}, here is your daily pocket money wrap-up:

TODAY'S METRICS:
- Total Spent Today: ${formatRupees(daily.spentPaise)}
- Daily Spending Limit: ${formatRupees(daily.limitPaise)}
- Reservoir Movement: ${
    daily.bankedPaise > 0
      ? `+${formatRupees(daily.bankedPaise)} banked into reservoir`
      : daily.reservoirUsedPaise > 0
      ? `-${formatRupees(daily.reservoirUsedPaise)} drawn from reservoir`
      : '₹0 change'
  }
- Current Reservoir Balance: ${formatRupees(daily.reservoirBalancePaise)}
- Uncovered Shortfall Today: ${formatRupees(daily.shortfallPaise)}

MONTHLY POSITION:
- Remaining Monthly Budget: ${formatRupees(Math.max(0, month.spendingBudgetPaise - month.totalSpentPaise))}
- Protected Original Savings Goal: ${formatRupees(month.originalSavingsGoalPaise)}
- Cumulative Shortfall: ${formatRupees(daily.cumulativeShortfallPaise)}
- Adjusted Projected Savings: ${formatRupees(daily.projectedSavingsPaise)}

DAILY INSIGHT:
"${insight}"

---------------------------------------------
PiggyPocket · Safe, realistic student budgeting
`.trim();

  // Responsive HTML Version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; margin: 0; padding: 24px 12px;">
  <div style="max-width: 520px; margin: 0 auto; background: #131b2e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: left;">
      <div style="font-size: 28px; line-height: 1;">🐷</div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 8px 0 2px; letter-spacing: -0.02em;">PiggyPocket Daily Summary</h1>
      <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 0;">${formattedDate} · Student Pocket Money</p>
    </div>

    <!-- Body Container -->
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #e2e8f0; margin-top: 0;">Hi <strong>${user.name}</strong>, here is your daily pocket money update:</p>

      <!-- Key Insight Card -->
      <div style="background: ${daily.shortfallPaise > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; border: 1px solid ${daily.shortfallPaise > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${daily.shortfallPaise > 0 ? '#f87171' : '#34d399'}; margin-bottom: 4px;">
          Daily Reservoir Insight
        </div>
        <div style="font-size: 14px; color: #f1f5f9; line-height: 1.45;">
          ${insight}
        </div>
      </div>

      <!-- Today's Numbers Grid -->
      <h2 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Today's Spending</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
          <td style="padding: 10px 0; color: #94a3b8;">Spent Today</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #ffffff;">${formatRupees(daily.spentPaise)}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
          <td style="padding: 10px 0; color: #94a3b8;">Daily Spending Limit</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #e2e8f0;">${formatRupees(daily.limitPaise)}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
          <td style="padding: 10px 0; color: #94a3b8;">Reservoir Movement</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${daily.bankedPaise > 0 ? '#34d399' : daily.reservoirUsedPaise > 0 ? '#f59e0b' : '#94a3b8'};">
            ${daily.bankedPaise > 0 ? `+${formatRupees(daily.bankedPaise)} banked` : daily.reservoirUsedPaise > 0 ? `-${formatRupees(daily.reservoirUsedPaise)} used` : '₹0'}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #94a3b8;">Reservoir Balance</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #34d399;">${formatRupees(daily.reservoirBalancePaise)}</td>
        </tr>
      </table>

      <!-- Monthly Health Grid -->
      <h2 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Monthly Projection</h2>
      <div style="background: rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Remaining Spending Budget</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #ffffff;">${formatRupees(Math.max(0, month.spendingBudgetPaise - month.totalSpentPaise))}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Original Savings Goal</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #34d399;">${formatRupees(month.originalSavingsGoalPaise)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Cumulative Shortfall</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${daily.cumulativeShortfallPaise > 0 ? '#f87171' : '#94a3b8'};">
              ${formatRupees(daily.cumulativeShortfallPaise)}
            </td>
          </tr>
          <tr style="border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <td style="padding: 8px 0 0; color: #e2e8f0; font-weight: 700;">Projected Savings</td>
            <td style="padding: 8px 0 0; text-align: right; font-weight: 800; font-size: 15px; color: ${daily.projectedSavingsPaise >= month.originalSavingsGoalPaise ? '#34d399' : '#f59e0b'};">
              ${formatRupees(daily.projectedSavingsPaise)}
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer Info -->
      <p style="font-size: 11px; color: #64748b; text-align: center; margin: 24px 0 0;">
        You are receiving this daily summary because email reminders are enabled in your PiggyPocket settings.<br>
        Change your summary time or disable alerts anytime in Notification Preferences.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

  return {
    subject,
    text,
    html,
    dailyMetrics: daily,
    monthMetrics: month,
    insight
  };
}
