/**
 * ANALYTICS & REPORTING SERVICE
 *
 * Standalone calculation service transforming shared financeEngine data
 * into visualization-ready structures, comparative metrics, and actionable alerts.
 *
 * STRICT RULES:
 * - Standalone calculations using shared engine numbers only.
 * - Zero emojis in messages, insights, or labels.
 * - Pure functions with unit test coverage.
 */

export const CATEGORY_COLORS = {
  Food: '#f59e0b',
  Travel: '#3b82f6',
  Shopping: '#ec4899',
  Education: '#8b5cf6',
  Entertainment: '#10b981',
  Bills: '#ef4444',
  Health: '#06b6d4',
  Other: '#64748b',
};

export const analyticsService = {
  /**
   * 1. Category-Wise Spending Analysis
   * Returns aggregated category breakdown with amounts, percentages, and colors.
   *
   * @param {Array<object>} transactions
   * @returns {{ categories: Array<{ category: string, amount: number, percentage: number, color: string }>, totalSpent: number, topCategory: object|null }}
   */
  calculateCategorySpending(transactions = []) {
    const totals = {};
    let totalSpent = 0;

    for (const tx of transactions) {
      const amount = Math.max(0, Number(tx.amount ?? tx.actualSpending ?? 0));
      if (amount <= 0) continue;

      const category = (tx.category || 'Other').trim();
      totals[category] = (totals[category] || 0) + amount;
      totalSpent += amount;
    }

    const categories = Object.entries(totals)
      .map(([category, amount]) => {
        const percentage = totalSpent > 0 ? Number(((amount / totalSpent) * 100).toFixed(1)) : 0;
        return {
          category,
          amount,
          percentage,
          color: CATEGORY_COLORS[category] || '#64748b',
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalSpent,
      topCategory: categories.length > 0 ? categories[0] : null,
    };
  },

  /**
   * 2. Daily Spending Trend Preparation
   * Formats day-by-day spending against daily limit with highlight indicators.
   *
   * @param {Array<object>} perDayBreakdown
   * @param {number} dailyLimit
   * @returns {Array<object>}
   */
  prepareDailySpendingTrend(perDayBreakdown = [], dailyLimit = 0) {
    return perDayBreakdown.map((day) => {
      const spent = day.actualSpending ?? 0;
      const limit = day.dailyLimit ?? dailyLimit;
      const isOverLimit = spent > limit;
      const surplus = day.surplus ?? Math.max(0, limit - spent);
      const overspending = day.overspending ?? Math.max(0, spent - limit);

      // Color coding: Red if over limit, Emerald if within limit and spent, Slate if 0 spent
      let barColor = '#10b981';
      if (isOverLimit) {
        barColor = '#ef4444';
      } else if (spent === 0) {
        barColor = '#94a3b8';
      }

      const dayLabel = day.date ? day.date.slice(8) : '';

      return {
        date: day.date,
        dayLabel: dayLabel ? `Day ${parseInt(dayLabel, 10)}` : day.date,
        spent,
        limit,
        isOverLimit,
        surplus,
        overspending,
        reserveUsed: day.reserveUsed ?? 0,
        savingsDeduction: day.savingsDeduction ?? 0,
        newReserve: day.newReserve ?? 0,
        barColor,
      };
    });
  },

  /**
   * 3. Reserve Wallet Balance Over Time
   * Line chart data showing reserve balance trajectory across the monthly cycle.
   *
   * @param {Array<object>} perDayBreakdown
   * @param {number} startingReserve
   * @returns {{ trend: Array<object>, peakReserve: number, finalReserve: number, startingReserve: number }}
   */
  prepareReserveTrend(perDayBreakdown = [], startingReserve = 0) {
    let peakReserve = startingReserve;
    const trend = perDayBreakdown.map((day, idx) => {
      const balance = day.newReserve ?? 0;
      if (balance > peakReserve) {
        peakReserve = balance;
      }

      const dayLabel = day.date ? day.date.slice(8) : `${idx + 1}`;

      return {
        date: day.date,
        dayLabel: `Day ${parseInt(dayLabel, 10)}`,
        reserveBalance: balance,
        surplusAdded: day.surplus ?? 0,
        reserveUsed: day.reserveUsed ?? 0,
      };
    });

    const finalReserve = trend.length > 0 ? trend[trend.length - 1].reserveBalance : startingReserve;

    return {
      trend,
      peakReserve,
      finalReserve,
      startingReserve,
    };
  },

  /**
   * 4. Monthly Comparison & Plain-Language Insights
   * Compares two months (Month A vs Month B) and generates human-readable comparative insights.
   *
   * @param {object} recordA - Baseline month (e.g. earlier month)
   * @param {object} recordB - Comparison month (e.g. later month)
   * @returns {object}
   */
  compareTwoMonths(recordA, recordB) {
    if (!recordA || !recordB) {
      return null;
    }

    const calcA = recordA.calculation || {};
    const calcB = recordB.calculation || {};

    const spendA = calcA.totalSpent ?? 0;
    const spendB = calcB.totalSpent ?? 0;

    // Spending difference and percentage change
    const spendDiff = spendB - spendA;
    const spendPercentChange = spendA > 0 ? Number(((spendDiff / spendA) * 100).toFixed(1)) : 0;

    // Category breakdown comparison
    const catA = this.calculateCategorySpending(recordA.transactions || []);
    const catB = this.calculateCategorySpending(recordB.transactions || []);

    const topA = catA.topCategory;
    const topB = catB.topCategory;

    // Reserve comparison
    const reserveAccumA = calcA.reserveAccumulated ?? 0;
    const reserveAccumB = calcB.reserveAccumulated ?? 0;
    const reserveDiff = reserveAccumB - reserveAccumA;

    // Savings protected (reserve used that avoided savings deductions)
    const protectedA = calcA.reserveUsed ?? 0;
    const protectedB = calcB.reserveUsed ?? 0;

    // Savings goal achievement
    const goalAchievedA = calcA.savingsGoalAchieved !== false;
    const goalAchievedB = calcB.savingsGoalAchieved !== false;

    // Generate plain-language insights
    const insights = [];

    // 1. Spending insight
    if (spendA > 0 && spendB > 0) {
      if (spendDiff < 0) {
        insights.push(
          `Spending went down ${Math.abs(spendPercentChange)}% compared with ${recordA.month} (INR ${spendB} vs INR ${spendA}).`
        );
      } else if (spendDiff > 0) {
        insights.push(
          `Spending increased by ${Math.abs(spendPercentChange)}% compared with ${recordA.month} (INR ${spendB} vs INR ${spendA}).`
        );
      } else {
        insights.push(`Total spending was identical between ${recordA.month} and ${recordB.month} (INR ${spendA}).`);
      }
    }

    // 2. Category shift insight
    if (topA && topB) {
      if (topA.category === topB.category) {
        insights.push(
          `${topB.category} remained your largest spending category in both months (${topB.percentage}% of spending).`
        );
      } else {
        insights.push(
          `Your top expense shifted from ${topA.category} (${topA.percentage}%) in ${recordA.month} to ${topB.category} (${topB.percentage}%) in ${recordB.month}.`
        );
      }
    }

    // 3. Reserve accumulation insight
    if (reserveDiff > 0) {
      insights.push(
        `You accumulated INR ${reserveDiff} more in your Reserve Wallet than in ${recordA.month}.`
      );
    } else if (reserveDiff < 0) {
      insights.push(
        `Reserve Wallet accumulation was INR ${Math.abs(reserveDiff)} lower than in ${recordA.month}.`
      );
    }

    // 4. Savings protection insight
    if (protectedB > 0) {
      insights.push(
        `Your Reserve Wallet absorbed INR ${protectedB} of unexpected expenses, shielding your savings goal.`
      );
    }

    // 5. Goal status insight
    if (goalAchievedB) {
      insights.push(`Savings goal for ${recordB.month} is on track (Projected: INR ${calcB.adjustedProjectedSavings ?? 0}).`);
    } else {
      insights.push(`Savings goal for ${recordB.month} has had INR ${calcB.cumulativeSavingsDeductions ?? 0} in deductions.`);
    }

    return {
      monthA: recordA.month,
      monthB: recordB.month,
      spendA,
      spendB,
      spendDiff,
      spendPercentChange,
      topA,
      topB,
      reserveAccumA,
      reserveAccumB,
      reserveDiff,
      protectedA,
      protectedB,
      goalAchievedA,
      goalAchievedB,
      insights,
    };
  },

  /**
   * 5. Consecutive Within-Budget Streak
   * Calculates how many consecutive days the user has stayed within the daily limit up to today.
   *
   * @param {Array<object>} perDayBreakdown
   * @param {string} todayDateStr - "YYYY-MM-DD"
   * @returns {number}
   */
  calculateSpendingStreak(perDayBreakdown = [], todayDateStr = '') {
    if (!perDayBreakdown || perDayBreakdown.length === 0) return 0;

    // Filter days up to today
    const daysUpToToday = perDayBreakdown.filter((d) => !todayDateStr || d.date <= todayDateStr);
    if (daysUpToToday.length === 0) return 0;

    let streak = 0;
    // Iterate backwards from the most recent day
    for (let i = daysUpToToday.length - 1; i >= 0; i--) {
      const d = daysUpToToday[i];
      const spent = d.actualSpending ?? 0;
      const limit = d.dailyLimit ?? 0;

      if (spent <= limit) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  },

  /**
   * 6. Proactive Alerts Engine
   * Generates alerts for approaching limit, low reserve, and savings drops.
   *
   * @param {object} params
   * @returns {Array<{ id: string, type: 'warning'|'danger'|'info', title: string, message: string }>}
   */
  generateBudgetAlerts({
    todaySpent = 0,
    dailyLimit = 0,
    currentReserve = 0,
    peakReserve = 0,
    cumulativeSavingsDeductions = 0,
    adjustedProjectedSavings = 0,
    originalSavingsGoal = 0,
  }) {
    const alerts = [];

    // Alert 1: Approaching Daily Limit (spent >= 80% and <= 100%)
    if (dailyLimit > 0) {
      const ratio = todaySpent / dailyLimit;
      if (ratio >= 0.8 && ratio <= 1.0) {
        const remaining = Number((dailyLimit - todaySpent).toFixed(2));
        alerts.push({
          id: 'alert_approaching_limit',
          type: 'warning',
          title: 'Approaching Daily Limit',
          message: `You have spent ${Math.round(ratio * 100)}% of today's limit. INR ${remaining} remaining for today.`,
        });
      } else if (ratio > 1.0) {
        const over = Number((todaySpent - dailyLimit).toFixed(2));
        alerts.push({
          id: 'alert_exceeded_limit',
          type: 'danger',
          title: 'Daily Limit Exceeded',
          message: `Today's spending is INR ${over} above your limit. Extra amount covered by Reserve Wallet or Savings.`,
        });
      }
    }

    // Alert 2: Reserve Wallet Running Low (balance <= 20% of peak or 0)
    if (currentReserve === 0 && peakReserve > 0) {
      alerts.push({
        id: 'alert_reserve_depleted',
        type: 'danger',
        title: 'Reserve Wallet Depleted',
        message: 'Reserve balance is INR 0. Any further daily overspending will deduct directly from your projected savings.',
      });
    } else if (peakReserve > 0 && currentReserve <= peakReserve * 0.25) {
      alerts.push({
        id: 'alert_reserve_low',
        type: 'warning',
        title: 'Reserve Wallet Running Low',
        message: `Reserve balance is down to INR ${currentReserve}. Spend cautiously to prevent dipping into your savings goal.`,
      });
    }

    // Alert 3: Projected Savings Dropping
    if (cumulativeSavingsDeductions > 0) {
      alerts.push({
        id: 'alert_savings_reduced',
        type: 'danger',
        title: 'Projected Savings Reduced',
        message: `Overspending has reduced your projected savings by INR ${cumulativeSavingsDeductions} (Target: INR ${originalSavingsGoal}, Projected: INR ${adjustedProjectedSavings}).`,
      });
    }

    return alerts;
  },

  /**
   * 7. Positive Celebration Milestones
   * Returns positive achievement messages for budget adherence and savings protection.
   *
   * @param {object} params
   * @returns {{ hasAchievement: boolean, title: string, message: string, badge: string, canCelebrate: boolean }}
   */
  generateCelebrationData({
    streak = 0,
    todaySpent = 0,
    dailyLimit = 0,
    cumulativeSavingsDeductions = 0,
  }) {
    if (streak >= 3) {
      return {
        hasAchievement: true,
        title: `${streak}-Day Budget Discipline Streak`,
        message: `Outstanding! You have stayed strictly within your daily limit for ${streak} consecutive days.`,
        badge: `${streak} Days On Track`,
        canCelebrate: true,
      };
    }

    if (dailyLimit > 0 && todaySpent <= dailyLimit && todaySpent > 0) {
      const savedToday = Number((dailyLimit - todaySpent).toFixed(2));
      return {
        hasAchievement: true,
        title: 'Within Budget Today',
        message: `Well done! Today's spending is within your daily limit. INR ${savedToday} added to your Reserve Wallet.`,
        badge: 'Budget Balanced',
        canCelebrate: false,
      };
    }

    if (cumulativeSavingsDeductions === 0 && dailyLimit > 0) {
      return {
        hasAchievement: true,
        title: 'Savings Goal 100% Protected',
        message: 'Your Reserve Wallet has shielded all expenses so far. Your projected savings remain untouched.',
        badge: 'Savings Intact',
        canCelebrate: false,
      };
    }

    return {
      hasAchievement: false,
      title: '',
      message: '',
      badge: '',
      canCelebrate: false,
    };
  },
};

