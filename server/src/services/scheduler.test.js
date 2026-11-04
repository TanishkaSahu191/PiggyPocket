import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetMemoryDb, query } from '../config/db.js';
import { schedulerService } from './schedulerService.js';
import { renderDailySummaryHtml } from '../templates/dailySummaryEmail.js';

describe('Daily Email Summaries & Scheduler Tests', () => {
  beforeEach(() => {
    resetMemoryDb();
    vi.restoreAllMocks();
  });

  describe('Timezone & Delivery Hour Determination', () => {
    it('calculates local hour and date for Asia/Kolkata correctly', () => {
      // 2026-11-04 14:30:00 UTC is 2026-11-04 20:00:00 IST (UTC+5:30)
      const utcDate = new Date('2026-11-04T14:30:00Z');
      const timeInfo = schedulerService.getUserLocalTime(utcDate, 'Asia/Kolkata');

      expect(timeInfo.localHour).toBe(20);
      expect(timeInfo.localDateStr).toBe('2026-11-04');
    });

    it('calculates local hour and date for America/New_York correctly', () => {
      // 2026-11-04 03:00:00 UTC is 2026-11-03 22:00:00 EST (UTC-5)
      const utcDate = new Date('2026-11-04T03:00:00Z');
      const timeInfo = schedulerService.getUserLocalTime(utcDate, 'America/New_York');

      expect(timeInfo.localDateStr).toBe('2026-11-03');
      expect(timeInfo.localHour).toBe(22);
    });
  });

  describe('HTML Template Rendering & Guidelines Compliance', () => {
    it('renders clean HTML with correct figures and projection disclaimer with ZERO emojis', () => {
      const html = renderDailySummaryHtml({
        userName: 'Tanishka Sahu',
        targetDate: '2026-11-04',
        monthName: '2026-11',
        daily: {
          dailyLimit: 150,
          actualSpending: 200,
          overspending: 50,
          reserveUsed: 50,
          savingsDeduction: 0,
          newReserve: 100,
        },
        monthly: {
          pocketMoney: 6000,
          originalSavingsGoal: 1500,
          totalSpent: 850,
          remainingSpendingBudget: 3650,
          currentReserveBalance: 100,
          reserveUsed: 50,
          cumulativeSavingsDeductions: 0,
          adjustedProjectedSavings: 1500,
        },
      });

      expect(html).toContain('Daily Spending Limit:');
      expect(html).toContain('INR 150');
      expect(html).toContain('Actual Spending Today:');
      expect(html).toContain('INR 200');
      expect(html).toContain('Remaining Reserve Wallet Balance:');
      expect(html).toContain('INR 100');
      expect(html).toContain('Monthly Pocket Money:');
      expect(html).toContain('INR 6000');
      expect(html).toContain('PROJECTION, not a real bank balance');

      // STRICT CHECK: ZERO EMOJIS ALLOWED
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(html)).toBe(false);
    });

    it('renders warning banner when Reserve Wallet hits 0 and savings are deducted', () => {
      const html = renderDailySummaryHtml({
        userName: 'Student',
        targetDate: '2026-11-04',
        monthName: '2026-11',
        daily: {
          dailyLimit: 100,
          actualSpending: 250,
          overspending: 150,
          reserveUsed: 50,
          savingsDeduction: 100,
          newReserve: 0,
        },
        monthly: {
          pocketMoney: 5000,
          originalSavingsGoal: 2000,
          totalSpent: 1200,
          remainingSpendingBudget: 1800,
          currentReserveBalance: 0,
          reserveUsed: 50,
          cumulativeSavingsDeductions: 100,
          adjustedProjectedSavings: 1900,
        },
      });

      expect(html).toContain('Warning: Reserve Wallet Depleted');
      expect(html).toContain('deducted INR 100 from your Projected Savings');
    });
  });

  describe('Duplicate Send Prevention & Retry Handling', () => {
    it('prevents sending duplicate daily summary on the same calendar day', async () => {
      // 1. Setup a monthly budget for demo user
      await query(
        `INSERT INTO monthly_budgets (id, user_id, month, pocket_money, date_received, savings_goal, daily_limit, is_custom_limit, starting_reserve, carry_forward_decision, previous_month_remaining_reserve, is_configured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        ['bgt_test_1', 'usr_demo_101', '2026-11', 5000, 1, 1000, 133, false, 0, 'none', 0, true]
      );

      // Spy on dispatchEmail
      const dispatchSpy = vi.spyOn(schedulerService, 'dispatchEmail').mockResolvedValue(true);

      // 2. First send
      const firstResult = await schedulerService.sendDailySummaryForUser({
        userId: 'usr_demo_101',
        targetDate: '2026-11-04',
        isManual: false,
      });

      expect(firstResult.success).toBe(true);
      expect(firstResult.skipped).toBeUndefined();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      // 3. Second send on the SAME date
      const secondResult = await schedulerService.sendDailySummaryForUser({
        userId: 'usr_demo_101',
        targetDate: '2026-11-04',
        isManual: false,
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.skipped).toBe(true);
      expect(secondResult.message).toContain('Duplicate send prevented');
      // Dispatch was not called a second time
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries when dispatch fails temporarily and records retry count', async () => {
      await query(
        `INSERT INTO monthly_budgets (id, user_id, month, pocket_money, date_received, savings_goal, daily_limit, is_custom_limit, starting_reserve, carry_forward_decision, previous_month_remaining_reserve, is_configured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        ['bgt_test_2', 'usr_demo_101', '2026-11', 5000, 1, 1000, 133, false, 0, 'none', 0, true]
      );

      // Fail first attempt, succeed on second
      let callCount = 0;
      vi.spyOn(schedulerService, 'dispatchEmail').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary SMTP Network Timeout');
        }
        return true;
      });

      const result = await schedulerService.sendDailySummaryForUser({
        userId: 'usr_demo_101',
        targetDate: '2026-11-05',
        isManual: false,
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(2);

      // Verify email_logs recorded 1 retry
      const logs = await schedulerService.getEmailLogs('usr_demo_101');
      const recentLog = logs.find((l) => l.date_sent === '2026-11-05');
      expect(recentLog).toBeDefined();
      expect(recentLog.status).toBe('sent');
      expect(recentLog.retry_count).toBe(1);
    });
  });

  describe('Settings API Endpoints', () => {
    let token;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'tanishkasahu191@gmail.com',
          password: 'Password123!',
        });
      token = loginRes.body.accessToken;
    });

    it('retrieves default email notification settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.dailyEmailEnabled).toBe(true);
      expect(res.body.settings.deliveryHour).toBe(22);
      expect(res.body.settings.timeZone).toBe('Asia/Kolkata');
    });

    it('updates user email settings and delivery hour', async () => {
      const updateRes = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dailyEmailEnabled: true,
          deliveryHour: 20,
          timeZone: 'Asia/Kolkata',
          notificationEmail: 'custom@college.edu',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify persisted
      const getRes = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.settings.deliveryHour).toBe(20);
      expect(getRes.body.settings.notificationEmail).toBe('custom@college.edu');
    });

    it('dispatches a test email on request', async () => {
      const testRes = await request(app)
        .post('/api/settings/send-test-email')
        .set('Authorization', `Bearer ${token}`);

      expect(testRes.status).toBe(200);
      expect(testRes.body.success).toBe(true);
      expect(testRes.body.message).toContain('dispatched');
    });

    it('manually triggers daily scheduler on request', async () => {
      const triggerRes = await request(app)
        .post('/api/settings/trigger-daily-scheduler')
        .set('Authorization', `Bearer ${token}`);

      expect(triggerRes.status).toBe(200);
      expect(triggerRes.body.success).toBe(true);
      expect(triggerRes.body.message).toContain('dispatched');
    });
  });
});
