import { describe, it, expect } from 'vitest';
import { analyticsService } from './analyticsService';

describe('Analytics Service Unit Tests', () => {
  describe('1. Category-Wise Spending Analysis', () => {
    it('aggregates transactions by category and calculates percentages', () => {
      const transactions = [
        { category: 'Food', amount: 300 },
        { category: 'Food', amount: 200 },
        { category: 'Travel', amount: 250 },
        { category: 'Shopping', amount: 250 },
      ];

      const result = analyticsService.calculateCategorySpending(transactions);

      expect(result.totalSpent).toBe(1000);
      expect(result.categories.length).toBe(3);

      const food = result.categories.find((c) => c.category === 'Food');
      expect(food.amount).toBe(500);
      expect(food.percentage).toBe(50);
      expect(result.topCategory.category).toBe('Food');
    });

    it('handles empty transaction list gracefully', () => {
      const result = analyticsService.calculateCategorySpending([]);
      expect(result.totalSpent).toBe(0);
      expect(result.categories).toEqual([]);
      expect(result.topCategory).toBeNull();
    });
  });

  describe('2. Daily Spending Trend', () => {
    it('formats daily spending against daily limit and identifies overspending days', () => {
      const breakdown = [
        { date: '2026-11-01', dailyLimit: 100, actualSpending: 50, surplus: 50, overspending: 0, newReserve: 50 },
        { date: '2026-11-02', dailyLimit: 100, actualSpending: 150, surplus: 0, overspending: 50, newReserve: 0 },
        { date: '2026-11-03', dailyLimit: 100, actualSpending: 0, surplus: 100, overspending: 0, newReserve: 100 },
      ];

      const trend = analyticsService.prepareDailySpendingTrend(breakdown, 100);

      expect(trend.length).toBe(3);
      expect(trend[0].isOverLimit).toBe(false);
      expect(trend[0].barColor).toBe('#10b981'); // within limit

      expect(trend[1].isOverLimit).toBe(true);
      expect(trend[1].barColor).toBe('#ef4444'); // over limit

      expect(trend[2].spent).toBe(0);
      expect(trend[2].barColor).toBe('#94a3b8'); // zero spend
    });
  });

  describe('3. Reserve Wallet Balance Over Time', () => {
    it('calculates reserve trajectory and records peak balance', () => {
      const breakdown = [
        { date: '2026-11-01', newReserve: 50 },
        { date: '2026-11-02', newReserve: 120 },
        { date: '2026-11-03', newReserve: 80 },
      ];

      const res = analyticsService.prepareReserveTrend(breakdown, 0);

      expect(res.trend.length).toBe(3);
      expect(res.peakReserve).toBe(120);
      expect(res.finalReserve).toBe(80);
    });
  });

  describe('4. Monthly Comparison & Insights', () => {
    it('compares two months and generates plain-language insights', () => {
      const monthA = {
        month: '2026-10',
        transactions: [{ category: 'Food', amount: 4000 }],
        calculation: {
          totalSpent: 4000,
          reserveAccumulated: 200,
          reserveUsed: 100,
          savingsGoalAchieved: true,
          adjustedProjectedSavings: 1500,
        },
      };

      const monthB = {
        month: '2026-11',
        transactions: [{ category: 'Education', amount: 3000 }],
        calculation: {
          totalSpent: 3000,
          reserveAccumulated: 350,
          reserveUsed: 50,
          savingsGoalAchieved: true,
          adjustedProjectedSavings: 1500,
        },
      };

      const comparison = analyticsService.compareTwoMonths(monthA, monthB);

      expect(comparison.spendDiff).toBe(-1000);
      expect(comparison.spendPercentChange).toBe(-25);
      expect(comparison.insights.length).toBeGreaterThanOrEqual(3);

      const spendInsight = comparison.insights.find((i) => i.includes('Spending went down'));
      expect(spendInsight).toContain('Spending went down 25%');

      const catInsight = comparison.insights.find((i) => i.includes('shifted from Food'));
      expect(catInsight).toBeDefined();
    });
  });

  describe('5. Spending Streak Calculation', () => {
    it('calculates consecutive within-budget days up to today', () => {
      const breakdown = [
        { date: '2026-11-01', dailyLimit: 100, actualSpending: 200 }, // Over limit
        { date: '2026-11-02', dailyLimit: 100, actualSpending: 80 },  // Under limit
        { date: '2026-11-03', dailyLimit: 100, actualSpending: 60 },  // Under limit
        { date: '2026-11-04', dailyLimit: 100, actualSpending: 90 },  // Under limit
      ];

      const streak = analyticsService.calculateSpendingStreak(breakdown, '2026-11-04');
      expect(streak).toBe(3);
    });

    it('returns 0 when most recent day exceeded the daily limit', () => {
      const breakdown = [
        { date: '2026-11-01', dailyLimit: 100, actualSpending: 50 },
        { date: '2026-11-02', dailyLimit: 100, actualSpending: 180 }, // Broke streak today
      ];

      const streak = analyticsService.calculateSpendingStreak(breakdown, '2026-11-02');
      expect(streak).toBe(0);
    });
  });

  describe('6. Proactive Alerts Engine', () => {
    it('triggers warning alert when approaching daily limit (>= 80%)', () => {
      const alerts = analyticsService.generateBudgetAlerts({
        todaySpent: 85,
        dailyLimit: 100,
        currentReserve: 150,
        peakReserve: 200,
      });

      const limitAlert = alerts.find((a) => a.id === 'alert_approaching_limit');
      expect(limitAlert).toBeDefined();
      expect(limitAlert.type).toBe('warning');
    });

    it('triggers danger alert when Reserve Wallet is depleted', () => {
      const alerts = analyticsService.generateBudgetAlerts({
        todaySpent: 50,
        dailyLimit: 100,
        currentReserve: 0,
        peakReserve: 200,
      });

      const reserveAlert = alerts.find((a) => a.id === 'alert_reserve_depleted');
      expect(reserveAlert).toBeDefined();
      expect(reserveAlert.type).toBe('danger');
    });

    it('triggers danger alert when savings deductions have occurred', () => {
      const alerts = analyticsService.generateBudgetAlerts({
        todaySpent: 50,
        dailyLimit: 100,
        currentReserve: 0,
        peakReserve: 0,
        cumulativeSavingsDeductions: 150,
        originalSavingsGoal: 1000,
        adjustedProjectedSavings: 850,
      });

      const savingsAlert = alerts.find((a) => a.id === 'alert_savings_reduced');
      expect(savingsAlert).toBeDefined();
      expect(savingsAlert.message).toContain('reduced your projected savings by INR 150');
    });
  });

  describe('7. Accumulated Savings & Monthly Performance Analysis', () => {
    it('handles empty months input gracefully', () => {
      const result = analyticsService.calculateAccumulatedSavings([], null);
      expect(result.totalAccumulatedSavings).toBe(0);
      expect(result.totalSavingsGoal).toBe(0);
      expect(result.monthsCount).toBe(0);
      expect(result.months).toEqual([]);
      expect(result.chartData).toEqual([]);
    });

    it('calculates accumulated savings and running totals across multiple months', () => {
      const records = [
        {
          month: '2026-09',
          pocketMoney: 2500,
          savingsGoal: 1000,
          calculation: { adjustedProjectedSavings: 1000, cumulativeSavingsDeductions: 0 },
        },
        {
          month: '2026-10',
          pocketMoney: 3000,
          savingsGoal: 1200,
          calculation: { adjustedProjectedSavings: 1100, cumulativeSavingsDeductions: 100 },
        },
      ];

      const activeRecord = {
        month: '2026-11',
        pocketMoney: 2500,
        savingsGoal: 1000,
        calculation: { adjustedProjectedSavings: 1000, cumulativeSavingsDeductions: 0 },
      };

      const result = analyticsService.calculateAccumulatedSavings(records, activeRecord);

      expect(result.monthsCount).toBe(3);
      expect(result.totalAccumulatedSavings).toBe(3100); // 1000 + 1100 + 1000
      expect(result.totalSavingsGoal).toBe(3200); // 1000 + 1200 + 1000
      expect(result.totalDeductions).toBe(100);
      expect(result.averageMonthlySavings).toBe(1033);
      expect(result.protectionRate).toBe(97); // 3100 / 3200 ~ 97%

      // Verify running cumulative totals
      expect(result.months[0].cumulativeTotal).toBe(1000);
      expect(result.months[1].cumulativeTotal).toBe(2100);
      expect(result.months[2].cumulativeTotal).toBe(3100);

      // Verify month labels for chart
      expect(result.chartData.length).toBe(3);
      expect(result.chartData[0].accumulatedSavings).toBe(1000);
      expect(result.chartData[2].accumulatedSavings).toBe(3100);
    });
  });

  describe('8. Verification of Guidelines Compliance', () => {
    it('verifies ZERO emojis in generated insights or alert messages', () => {
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      const alerts = analyticsService.generateBudgetAlerts({
        todaySpent: 120,
        dailyLimit: 100,
        currentReserve: 0,
        peakReserve: 100,
        cumulativeSavingsDeductions: 20,
      });

      alerts.forEach((alert) => {
        expect(emojiRegex.test(alert.title)).toBe(false);
        expect(emojiRegex.test(alert.message)).toBe(false);
      });

      const celeb = analyticsService.generateCelebrationData({
        streak: 5,
        todaySpent: 40,
        dailyLimit: 100,
      });

      expect(emojiRegex.test(celeb.title)).toBe(false);
      expect(emojiRegex.test(celeb.message)).toBe(false);
    });

    it('verifies ZERO emojis in analytics and reports source code files', () => {
      const fs = require('fs');
      const path = require('path');
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;

      const targetFiles = [
        path.resolve(__dirname, 'analyticsService.js'),
        path.resolve(__dirname, '../pages/Reports.jsx'),
        path.resolve(__dirname, '../components/common/CelebrationConfetti.js'),
      ];

      targetFiles.forEach((file) => {
        const text = fs.readFileSync(file, 'utf-8');
        expect(emojiRegex.test(text)).toBe(false);
      });
    });
  });
});
