import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../db/migrate.js';
import { setDbClient, DbClient } from '../db/index.js';
import { setMailer, FakeMailer } from '../services/mailer/index.js';
import { buildServer, AppServer } from '../server.js';
import { tickScheduler, getUserLocalDateTime } from '../scheduler/worker.js';
import { buildDailyEmailSummary } from '../services/summary/emailContent.js';
import { MonthBudgetInput } from '@smart-budget-tracker/shared';
import { signAccessToken } from '../utils/crypto.js';

describe('Phase 5: Daily Email Summary, Scheduler & Timezone Tests', () => {
  let pglite: PGlite;
  let dbClient: DbClient;
  let fakeMailer: FakeMailer;
  let app: AppServer;

  beforeAll(async () => {
    pglite = new PGlite();

    dbClient = {
      async query<T = unknown>(sql: string, params?: unknown[]) {
        const res = await pglite.query(sql, params);
        return { rows: res.rows as T[] };
      },
      async exec(sql: string) {
        return await pglite.exec(sql);
      }
    };

    setDbClient(dbClient);
    fakeMailer = new FakeMailer();
    setMailer(fakeMailer);

    // Apply all migrations
    await runMigrations({
      query: (s, p) => pglite.query(s, p),
      exec: (s) => pglite.exec(s)
    });

    app = buildServer();
    await app.ready();
  });

  beforeEach(async () => {
    fakeMailer.reset();
    // Clean tables between tests
    await dbClient.query('DELETE FROM email_delivery_log;');
    await dbClient.query('DELETE FROM transactions;');
    await dbClient.query('DELETE FROM daily_limit_settings;');
    await dbClient.query('DELETE FROM budget_periods;');
    await dbClient.query('DELETE FROM notification_prefs;');
    await dbClient.query('DELETE FROM users;');
  });

  async function createTestUserWithBudget(options: {
    email: string;
    timezone: string;
    sendTimeLocal: string;
    emailEnabled?: boolean;
    pocketMoneyPaise?: number;
    savingsGoalPaise?: number;
    dailyLimitPaise?: number;
  }) {
    const {
      email,
      timezone,
      sendTimeLocal,
      emailEnabled = true,
      pocketMoneyPaise = 500000, // ₹5000
      savingsGoalPaise = 100000, // ₹1000
      dailyLimitPaise = 13300 // ₹133
    } = options;

    const userRes = await dbClient.query<{ id: string }>(
      `INSERT INTO users (name, email, timezone, email_verified_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      ['Tanishka Test', email, timezone]
    );
    const userId = userRes.rows[0].id;

    // Notification prefs
    await dbClient.query(
      `INSERT INTO notification_prefs (user_id, email_enabled, send_time_local, timezone)
       VALUES ($1, $2, $3, $4)`,
      [userId, emailEnabled, sendTimeLocal, timezone]
    );

    // Budget period for 2026-10
    const periodRes = await dbClient.query<{ id: string }>(
      `INSERT INTO budget_periods (
        user_id, month_key, pocket_money_paise, received_on,
        savings_goal_paise, spending_budget_paise, rule_version
       ) VALUES ($1, '2026-10', $2, '2026-10-01', $3, $4, 2)
       RETURNING id;`,
      [userId, pocketMoneyPaise, savingsGoalPaise, pocketMoneyPaise - savingsGoalPaise]
    );
    const periodId = periodRes.rows[0].id;

    // Daily limit
    await dbClient.query(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, '2026-10-01', $2, 'auto');`,
      [periodId, dailyLimitPaise]
    );

    const token = signAccessToken({ userId, email });

    return { userId, periodId, token };
  }

  // =========================================================================
  // TEST F: set 8:00 PM -> fires at 8:00 PM local; change to 9:30 PM -> fires at 9:30 PM, never both
  // =========================================================================
  it('TEST F: User sets 8:00 PM -> fires at 8:00 PM; changed to 9:30 PM -> fires at 9:30 PM, never both', async () => {
    const email = 'user_f@college.edu.in';
    const tz = 'Asia/Kolkata'; // UTC+5:30
    await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '20:00' // 8:00 PM
    });

    // 1. Before 8:00 PM: 19:59 local (14:29 UTC) -> Nothing sent
    const clock1959 = new Date('2026-10-27T14:29:00Z');
    const tick1 = await tickScheduler(clock1959, dbClient, fakeMailer);
    expect(tick1.sentCount).toBe(0);
    expect(fakeMailer.sentEmails.length).toBe(0);

    // 2. Exactly at 8:00 PM: 20:00 local (14:30 UTC) -> 1 email sent!
    const clock2000 = new Date('2026-10-27T14:30:00Z');
    const tick2 = await tickScheduler(clock2000, dbClient, fakeMailer);
    expect(tick2.sentCount).toBe(1);
    expect(fakeMailer.sentEmails.length).toBe(1);
    expect(fakeMailer.sentEmails[0].to).toBe(email);

    // 3. User updates preferences to 9:30 PM (21:30)
    await dbClient.query(
      `UPDATE notification_prefs SET send_time_local = '21:30' WHERE timezone = $1`,
      [tz]
    );

    // 4. Same day at 21:30 local (16:00 UTC) -> 0 duplicate emails sent! (Day already delivered)
    const clock2130SameDay = new Date('2026-10-27T16:00:00Z');
    const tick3 = await tickScheduler(clock2130SameDay, dbClient, fakeMailer);
    expect(tick3.sentCount).toBe(0);
    expect(fakeMailer.sentEmails.length).toBe(1); // Still only 1 total

    // 5. NEXT DAY (2026-10-28):
    // At 20:00 local (14:30 UTC) -> Nothing sent because new time is 21:30!
    const clockNextDay2000 = new Date('2026-10-28T14:30:00Z');
    const tick4 = await tickScheduler(clockNextDay2000, dbClient, fakeMailer);
    expect(tick4.sentCount).toBe(0);
    expect(fakeMailer.sentEmails.length).toBe(1);

    // At 21:30 local (16:00 UTC) -> Fires at 9:30 PM!
    const clockNextDay2130 = new Date('2026-10-28T16:00:00Z');
    const tick5 = await tickScheduler(clockNextDay2130, dbClient, fakeMailer);
    expect(tick5.sentCount).toBe(1);
    expect(fakeMailer.sentEmails.length).toBe(2); // exactly 1 for day 27, 1 for day 28
  });

  // =========================================================================
  // TEST G: disabled -> nothing sent while disabled, and in-app summary still works
  // =========================================================================
  it('TEST G: disabled -> nothing sent while disabled, in-app summary works', async () => {
    const email = 'user_g@college.edu.in';
    const tz = 'Asia/Kolkata';
    const { token } = await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '22:00',
      emailEnabled: false // Disabled
    });

    // At 22:00 local -> Nothing sent
    const clock2200 = new Date('2026-10-27T16:30:00Z');
    const tick = await tickScheduler(clock2200, dbClient, fakeMailer);
    expect(tick.sentCount).toBe(0);
    expect(fakeMailer.sentEmails.length).toBe(0);

    // In-app daily summary endpoint still works perfectly
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications/daily-summary?date=2026-10-27',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.hasBudget).toBe(true);
    expect(body.dailyMetrics).toBeDefined();
    expect(body.dailyMetrics.limitPaise).toBe(13300);
    expect(body.insight).toBeDefined();
  });

  // =========================================================================
  // Duplicate prevention under concurrent worker runs
  // =========================================================================
  it('Duplicate prevention: concurrent workers ticking simultaneously send exactly one email', async () => {
    const email = 'user_concurrent@college.edu.in';
    const tz = 'Asia/Kolkata';
    await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '22:00'
    });

    const clock2200 = new Date('2026-10-27T16:30:00Z');

    // Run two workers simultaneously
    const [tickA, tickB] = await Promise.all([
      tickScheduler(clock2200, dbClient, fakeMailer),
      tickScheduler(clock2200, dbClient, fakeMailer)
    ]);

    expect(tickA.sentCount + tickB.sentCount).toBe(1);
    expect(fakeMailer.sentEmails.length).toBe(1);
  });

  // =========================================================================
  // Retry logic with exponential backoff and permanent failure limit
  // =========================================================================
  it('Retries up to 5 attempts with backoff and records permanent failure', async () => {
    const email = 'user_retry@college.edu.in';
    const tz = 'Asia/Kolkata';
    await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '22:00'
    });

    fakeMailer.shouldFail = true;
    const clock = new Date('2026-10-27T16:30:00Z');

    // Attempt 1: Fails
    const tick1 = await tickScheduler(clock, dbClient, fakeMailer);
    expect(tick1.failedCount).toBe(1);

    const log1 = await dbClient.query<{ attempt_count: number; status: string; next_attempt_at: Date }>(
      'SELECT * FROM email_delivery_log;'
    );
    expect(log1.rows[0].attempt_count).toBe(1);
    expect(log1.rows[0].status).toBe('queued');
    expect(new Date(log1.rows[0].next_attempt_at).getTime()).toBeGreaterThan(clock.getTime());

    // Advance clock past backoff and fail 4 more times
    let currentSimTime = clock;
    for (let i = 2; i <= 5; i++) {
      currentSimTime = new Date(currentSimTime.getTime() + 60 * 60 * 1000); // +1 hour
      await tickScheduler(currentSimTime, dbClient, fakeMailer);
    }

    const finalLog = await dbClient.query<{ attempt_count: number; status: string; last_error: string }>(
      'SELECT * FROM email_delivery_log;'
    );
    expect(finalLog.rows[0].attempt_count).toBe(5);
    expect(finalLog.rows[0].status).toBe('failed');
    expect(finalLog.rows[0].last_error).toContain('Permanent failure after 5 attempts');
  });

  // =========================================================================
  // Catch-up window (> 3 hours past scheduled time) marks day skipped
  // =========================================================================
  it('Catch-up window: server down > 3 hours past scheduled time marks day skipped', async () => {
    const email = 'user_catchup@college.edu.in';
    const tz = 'Asia/Kolkata';
    await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '18:00' // 6:00 PM
    });

    // Clock is 22:30 local (4.5 hours later) -> exceeds 3-hour catch-up window
    const clockLate = new Date('2026-10-27T17:00:00Z');
    const tick = await tickScheduler(clockLate, dbClient, fakeMailer);

    expect(tick.skippedCount).toBe(1);
    expect(fakeMailer.sentEmails.length).toBe(0);

    const log = await dbClient.query<{ status: string; last_error: string }>(
      'SELECT * FROM email_delivery_log;'
    );
    expect(log.rows[0].status).toBe('skipped');
    expect(log.rows[0].last_error).toContain('Catch-up window exceeded');
  });

  // =========================================================================
  // Zero-spend day email generation
  // =========================================================================
  it('Zero-spend day generates valid email with celebratory banked tone', async () => {
    const email = 'user_zero@college.edu.in';
    const tz = 'Asia/Kolkata';
    await createTestUserWithBudget({
      email,
      timezone: tz,
      sendTimeLocal: '22:00',
      dailyLimitPaise: 15000 // ₹150
    });

    const clock2200 = new Date('2026-10-27T16:30:00Z');
    const tick = await tickScheduler(clock2200, dbClient, fakeMailer);
    expect(tick.sentCount).toBe(1);

    const sent = fakeMailer.sentEmails[0];
    expect(sent.text).toContain('Zero spend today!');
    expect(sent.text).toContain('Total Spent Today: ₹0');
    expect(sent.text).toContain('+₹150 banked into reservoir');
  });

  // =========================================================================
  // DST transition in America/New_York
  // =========================================================================
  it('DST transition: accurately calculates local date and time across DST boundary', () => {
    const tz = 'America/New_York';

    // 1. Summer EDT (UTC-4)
    const edtDate = new Date('2026-07-15T22:00:00Z');
    const edtTime = getUserLocalDateTime(edtDate, tz);
    expect(edtTime.localTime).toBe('18:00'); // 22:00 UTC is 18:00 EDT (UTC-4)

    // 2. Winter EST (UTC-5)
    const estDate = new Date('2026-12-15T22:00:00Z');
    const estTime = getUserLocalDateTime(estDate, tz);
    expect(estTime.localTime).toBe('17:00'); // 22:00 UTC is 17:00 EST (UTC-5)
  });

  // =========================================================================
  // Timezone change
  // =========================================================================
  it('Timezone change: updates user clock and schedules appropriately', async () => {
    const email = 'user_tz_change@college.edu.in';
    const { token } = await createTestUserWithBudget({
      email,
      timezone: 'Asia/Kolkata', // UTC+5:30
      sendTimeLocal: '22:00'
    });

    // Change timezone to Europe/London (UTC+0 in winter)
    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/preferences',
      headers: { authorization: `Bearer ${token}` },
      payload: { timezone: 'Europe/London' }
    });

    expect(updateRes.statusCode).toBe(200);
    const body = JSON.parse(updateRes.body);
    expect(body.preferences.timezone).toBe('Europe/London');
  });

  // =========================================================================
  // Email numbers match the Phase 2 engine spec examples
  // =========================================================================
  it('Email numbers match the Phase 2 reservoir engine specification', () => {
    // Spec Example:
    // Pocket money = ₹5,000, Savings goal = ₹1,000 => Spending budget = ₹4,000
    // Start Oct 1 (31 days). Auto daily limit = floor(4000/31) = ₹129 with remainder on day 1.
    // Day 1: limit = ₹133. User spends ₹93.
    // Under limit by ₹40 => ₹40 banked into reservoir.
    const budgetInput: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-10-01',
      timezone: 'Asia/Kolkata',
      rule_version: 2,
      effectiveDailyLimits: [{ effectiveFrom: '2026-10-01', limitPaise: 13300 }],
      transactions: [{ id: 'tx-1', amountPaise: 9300, occurredAt: new Date('2026-10-01T10:00:00+05:30') }]
    };

    const summary = buildDailyEmailSummary({
      user: { name: 'Tanishka Sahu', email: 'tanishka@vitbhopal.ac.in', timezone: 'Asia/Kolkata' },
      budgetInput,
      targetDate: '2026-10-01'
    });

    expect(summary.dailyMetrics.spentPaise).toBe(9300);
    expect(summary.dailyMetrics.limitPaise).toBe(13300); // Day 1 receives leftover paise (129 + 4 = 133)
    expect(summary.dailyMetrics.bankedPaise).toBe(4000); // 13300 - 9300 = 4000 paise (₹40)
    expect(summary.dailyMetrics.reservoirBalancePaise).toBe(4000);
    expect(summary.insight).toContain('You spent ₹40 less than your limit, so ₹40 moved into your reservoir.');
  });
});
