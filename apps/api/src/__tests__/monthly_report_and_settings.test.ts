import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../db/migrate.js';
import { setDbClient, DbClient } from '../db/index.js';
import { setMailer, FakeMailer } from '../services/mailer/index.js';
import { buildServer, AppServer } from '../server.js';
import { signAccessToken } from '../utils/crypto.js';
import { computeFullMonthlyReport, MonthBudgetInput } from '@smart-budget-tracker/shared';

describe('Phase 6: Monthly Report, New-Month Reset and Settings Tests', () => {
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

    await runMigrations({
      query: (s, p) => pglite.query(s, p),
      exec: (s) => pglite.exec(s)
    });

    app = buildServer();
    await app.ready();
  });

  beforeEach(async () => {
    fakeMailer.reset();
    await dbClient.query('DELETE FROM budget_period_audit;');
    await dbClient.query('DELETE FROM category_rules;');
    await dbClient.query('DELETE FROM transactions;');
    await dbClient.query('DELETE FROM daily_limit_settings;');
    await dbClient.query('DELETE FROM budget_periods;');
    await dbClient.query('DELETE FROM otp_codes;');
    await dbClient.query('DELETE FROM notification_prefs;');
    await dbClient.query('DELETE FROM users;');
  });

  async function createTestUser(email = 'student@test.com', timezone = 'Asia/Kolkata') {
    const userRes = await dbClient.query<{ id: string }>(
      `INSERT INTO users (name, email, phone, timezone)
       VALUES ('Aarav Sharma', $1, '+919876543210', $2)
       RETURNING id`,
      [email, timezone]
    );
    const userId = userRes.rows[0].id;
    const token = signAccessToken({ userId, email });
    return { userId, token };
  }

  // 1. TEST K: A new month starts clean and history stays intact
  it('TEST K: a new month starts clean and history stays intact (nothing carries over)', async () => {
    const { userId, token } = await createTestUser();

    // Setup Month 1: 2026-09
    const period1Res = await dbClient.query<{ id: string }>(
      `INSERT INTO budget_periods (
        user_id, month_key, pocket_money_paise, received_on,
        savings_goal_paise, spending_budget_paise, rule_version
      ) VALUES ($1, '2026-09', 500000, '2026-09-01', 100000, 400000, 2)
      RETURNING id`,
      [userId]
    );
    const p1Id = period1Res.rows[0].id;

    await dbClient.query(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, '2026-09-01', 13333, 'auto')`,
      [p1Id]
    );

    // Add heavy expense in September causing shortfall (overspending)
    await dbClient.query(
      `INSERT INTO transactions (user_id, amount_paise, category, note, occurred_at)
       VALUES ($1, 450000, 'Electronics', 'New tablet', '2026-09-10T12:00:00Z')`,
      [userId]
    );

    // Verify Month 1 report reflects shortfall
    const rep1Res = await app.inject({
      method: 'GET',
      url: '/api/reports/monthly?monthKey=2026-09',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(rep1Res.statusCode).toBe(200);
    const rep1 = rep1Res.json();
    expect(rep1.totalSpentPaise).toBe(450000);
    expect(rep1.cumulativeShortfallPaise).toBeGreaterThan(0);
    expect(rep1.projectedSavingsPaise).toBeLessThan(100000);

    // Now start Month 2 (2026-10) via /api/budget/new-month
    const newMonthRes = await app.inject({
      method: 'POST',
      url: '/api/budget/new-month',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        monthKey: '2026-10',
        pocketMoneyPaise: 600000,
        receivedOn: '2026-10-01',
        savingsGoalPaise: 150000,
        dailyLimitMode: 'auto'
      }
    });
    expect(newMonthRes.statusCode).toBe(201);

    // Verify Month 2 starts completely fresh:
    // Reservoir balance starts at 0, cumulative shortfall starts at 0, projected savings = original savings goal
    const rep2Res = await app.inject({
      method: 'GET',
      url: '/api/reports/monthly?monthKey=2026-10',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(rep2Res.statusCode).toBe(200);
    const rep2 = rep2Res.json();
    expect(rep2.pocketMoneyPaise).toBe(600000);
    expect(rep2.originalSavingsGoalPaise).toBe(150000);
    expect(rep2.totalSpentPaise).toBe(0);
    expect(rep2.cumulativeShortfallPaise).toBe(0);
    expect(rep2.projectedSavingsPaise).toBe(150000);
    expect(rep2.reservoirUsage.totalDrawnPaise).toBe(0);

    // Crucial check: Month 1 history remains intact and unchanged
    const rep1AfterRes = await app.inject({
      method: 'GET',
      url: '/api/reports/monthly?monthKey=2026-09',
      headers: { authorization: `Bearer ${token}` }
    });
    const rep1After = rep1AfterRes.json();
    expect(rep1After.totalSpentPaise).toBe(450000);
    expect(rep1After.cumulativeShortfallPaise).toBe(rep1.cumulativeShortfallPaise);
  });

  // 2. Report numbers equal engine for seeded data
  it('report numbers equal the engine for seeded data', async () => {
    const { userId, token } = await createTestUser();

    const periodRes = await dbClient.query<{ id: string }>(
      `INSERT INTO budget_periods (
        user_id, month_key, pocket_money_paise, received_on,
        savings_goal_paise, spending_budget_paise, rule_version
      ) VALUES ($1, '2026-10', 500000, '2026-10-01', 100000, 400000, 2)
      RETURNING id`,
      [userId]
    );
    const periodId = periodRes.rows[0].id;

    await dbClient.query(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, '2026-10-01', 12903, 'auto')`,
      [periodId]
    );

    // Seed transactions
    const tx1Occurred = '2026-10-02T10:00:00Z';
    const tx2Occurred = '2026-10-05T15:30:00Z';
    await dbClient.query(
      `INSERT INTO transactions (user_id, amount_paise, category, note, occurred_at)
       VALUES
       ($1, 5000, 'Food', 'Lunch', $2),
       ($1, 20000, 'Books', 'Textbook', $3)`,
      [userId, tx1Occurred, tx2Occurred]
    );

    // Compute expected numbers directly from the pure shared engine
    const engineInput: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      receivedOn: '2026-10-01',
      originalSavingsGoalPaise: 100000,
      timezone: 'Asia/Kolkata',
      rule_version: 2,
      effectiveDailyLimits: [{ effectiveFrom: '2026-10-01', limitPaise: 12903 }],
      transactions: [
        { id: '1', amountPaise: 5000, category: 'Food', occurredAt: tx1Occurred },
        { id: '2', amountPaise: 20000, category: 'Books', occurredAt: tx2Occurred }
      ]
    };
    const engineReport = computeFullMonthlyReport({ input: engineInput, asOfDate: '2026-10-10' });

    // Request from API
    const res = await app.inject({
      method: 'GET',
      url: '/api/reports/monthly?monthKey=2026-10&asOfDate=2026-10-10',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.pocketMoneyPaise).toBe(engineReport.pocketMoneyPaise);
    expect(body.originalSavingsGoalPaise).toBe(engineReport.originalSavingsGoalPaise);
    expect(body.initialSpendingBudgetPaise).toBe(engineReport.initialSpendingBudgetPaise);
    expect(body.totalSpentPaise).toBe(engineReport.totalSpentPaise);
    expect(body.remainingMonthlyBudgetPaise).toBe(engineReport.remainingMonthlyBudgetPaise);
    expect(body.cumulativeShortfallPaise).toBe(engineReport.cumulativeShortfallPaise);
    expect(body.projectedSavingsPaise).toBe(engineReport.projectedSavingsPaise);
    expect(body.reservoirUsage.totalBankedPaise).toBe(engineReport.reservoirUsage.totalBankedPaise);
    expect(body.reservoirUsage.totalDrawnPaise).toBe(engineReport.reservoirUsage.totalDrawnPaise);
  });

  // 3. Editing goal mid-month recalculates correctly and creates audit log
  it('editing the goal mid-month recalculates correctly and creates an audit log', async () => {
    const { userId, token } = await createTestUser();

    // Create current active period
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    const periodRes = await dbClient.query<{ id: string }>(
      `INSERT INTO budget_periods (
        user_id, month_key, pocket_money_paise, received_on,
        savings_goal_paise, spending_budget_paise, rule_version
      ) VALUES ($1, $2, 500000, $3, 100000, 400000, 2)
      RETURNING id`,
      [userId, currentMonthKey, `${currentMonthKey}-01`]
    );
    const periodId = periodRes.rows[0].id;

    // Add transaction
    await dbClient.query(
      `INSERT INTO transactions (user_id, amount_paise, category, note, occurred_at)
       VALUES ($1, 25000, 'Food', 'Dinner', NOW())`,
      [userId]
    );

    // Edit budget period: increase savings goal from 100000 to 150000
    const editRes = await app.inject({
      method: 'PATCH',
      url: '/api/settings/budget-period',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        pocketMoneyPaise: 500000,
        savingsGoalPaise: 150000,
        reason: 'Decided to save for summer trip'
      }
    });

    expect(editRes.statusCode).toBe(200);
    const editBody = editRes.json();
    expect(editBody.budgetPeriod.savingsGoalPaise).toBe(150000);
    expect(editBody.budgetPeriod.spendingBudgetPaise).toBe(350000);

    // Check that audit row was recorded
    const auditRes = await dbClient.query<{
      old_savings_goal_paise: string;
      new_savings_goal_paise: string;
      reason: string;
    }>(
      `SELECT old_savings_goal_paise, new_savings_goal_paise, reason
       FROM budget_period_audit
       WHERE budget_period_id = $1`,
      [periodId]
    );

    expect(auditRes.rows.length).toBe(1);
    expect(Number(auditRes.rows[0].old_savings_goal_paise)).toBe(100000);
    expect(Number(auditRes.rows[0].new_savings_goal_paise)).toBe(150000);
    expect(auditRes.rows[0].reason).toBe('Decided to save for summer trip');

    // Check that report recalculates live and transactions remain intact
    const repRes = await app.inject({
      method: 'GET',
      url: `/api/reports/monthly?monthKey=${currentMonthKey}`,
      headers: { authorization: `Bearer ${token}` }
    });
    const rep = repRes.json();
    expect(rep.totalSpentPaise).toBe(25000);
    expect(rep.originalSavingsGoalPaise).toBe(150000);
    expect(rep.initialSpendingBudgetPaise).toBe(350000);
    expect(rep.remainingMonthlyBudgetPaise).toBe(325000);
  });

  // 4. Email change requires OTP
  it('an email change requires OTP verification of the NEW email before it is updated', async () => {
    const { userId, token } = await createTestUser('old@student.com');

    // 1. Request email change
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/settings/email/request-change',
      headers: { authorization: `Bearer ${token}` },
      payload: { newEmail: 'new@student.com' }
    });
    expect(reqRes.statusCode).toBe(200);

    // Verify user's active email is NOT changed yet
    const userPre = await dbClient.query<{ email: string; pending_email: string }>(
      'SELECT email, pending_email FROM users WHERE id = $1',
      [userId]
    );
    expect(userPre.rows[0].email).toBe('old@student.com');
    expect(userPre.rows[0].pending_email).toBe('new@student.com');

    // Check that OTP code was generated and sent
    const otpRes = await dbClient.query<{ id: string }>(
      `SELECT id FROM otp_codes WHERE email = 'new@student.com' AND purpose = 'change_email'`
    );
    expect(otpRes.rows.length).toBe(1);
    expect(fakeMailer.sentOtps.length).toBe(1);
    const sentOtp = fakeMailer.sentOtps[0].otp;

    // 2. Bad OTP attempt should fail
    const badRes = await app.inject({
      method: 'POST',
      url: '/api/settings/email/verify-change',
      headers: { authorization: `Bearer ${token}` },
      payload: { newEmail: 'new@student.com', code: '000000' }
    });
    expect(badRes.statusCode).toBe(400);

    // 3. Good OTP attempt succeeds and updates email
    const goodRes = await app.inject({
      method: 'POST',
      url: '/api/settings/email/verify-change',
      headers: { authorization: `Bearer ${token}` },
      payload: { newEmail: 'new@student.com', code: sentOtp }
    });
    expect(goodRes.statusCode).toBe(200);

    // Verify email is now new@student.com and pending_email is cleared
    const userPost = await dbClient.query<{ email: string; pending_email: string | null }>(
      'SELECT email, pending_email FROM users WHERE id = $1',
      [userId]
    );
    expect(userPost.rows[0].email).toBe('new@student.com');
    expect(userPost.rows[0].pending_email).toBeNull();
  });

  // 5. Late expense for a past month changes only that past month's report
  it("a late expense for a past month changes only that past month's report", async () => {
    const { userId, token } = await createTestUser();

    // Create periods for 2026-08 and 2026-09
    await dbClient.query(
      `INSERT INTO budget_periods (user_id, month_key, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise)
       VALUES
       ($1, '2026-08', 500000, '2026-08-01', 100000, 400000),
       ($1, '2026-09', 500000, '2026-09-01', 100000, 400000)`,
      [userId]
    );

    // Initial check for both months
    const repAug1 = (
      await app.inject({
        method: 'GET',
        url: '/api/reports/monthly?monthKey=2026-08',
        headers: { authorization: `Bearer ${token}` }
      })
    ).json();
    const repSep1 = (
      await app.inject({
        method: 'GET',
        url: '/api/reports/monthly?monthKey=2026-09',
        headers: { authorization: `Bearer ${token}` }
      })
    ).json();

    expect(repAug1.totalSpentPaise).toBe(0);
    expect(repSep1.totalSpentPaise).toBe(0);

    // Log a late expense for August (occurredAt = 2026-08-15)
    const txRes = await app.inject({
      method: 'POST',
      url: '/api/transactions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountPaise: 45000,
        category: 'Travel',
        note: 'Late bus ticket from August trip',
        occurredAt: '2026-08-15T10:00:00Z'
      }
    });
    expect(txRes.statusCode).toBe(201);

    // Query August report again
    const repAug2 = (
      await app.inject({
        method: 'GET',
        url: '/api/reports/monthly?monthKey=2026-08',
        headers: { authorization: `Bearer ${token}` }
      })
    ).json();

    // Query September report again
    const repSep2 = (
      await app.inject({
        method: 'GET',
        url: '/api/reports/monthly?monthKey=2026-09',
        headers: { authorization: `Bearer ${token}` }
      })
    ).json();

    // August spent increased by 45000
    expect(repAug2.totalSpentPaise).toBe(45000);
    expect(repAug2.remainingMonthlyBudgetPaise).toBe(355000);

    // September spent is completely UNCHANGED (still 0)
    expect(repSep2.totalSpentPaise).toBe(0);
    expect(repSep2.remainingMonthlyBudgetPaise).toBe(400000);
  });

  // 6. Keyword -> category rule auto-tagging
  it('automatically resolves transaction category from keyword rules', async () => {
    const { userId, token } = await createTestUser();

    // Create a keyword rule: "swiggy" -> "Food"
    await app.inject({
      method: 'POST',
      url: '/api/settings/category-rules',
      headers: { authorization: `Bearer ${token}` },
      payload: { keyword: 'swiggy', category: 'Food' }
    });

    // Create transaction without category or category='General'
    const txRes = await app.inject({
      method: 'POST',
      url: '/api/transactions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountPaise: 25000,
        note: 'Dinner via Swiggy delivery'
      }
    });

    expect(txRes.statusCode).toBe(201);
    expect(txRes.json().transaction.category).toBe('Food');
  });

  // 7. Daily limit effective from today forward
  it('daily limit modification creates effective-dated entry for today and does not rewrite past entries', async () => {
    const { userId, token } = await createTestUser();
    const currentMonthKey = new Date().toISOString().substring(0, 7);

    const periodRes = await dbClient.query<{ id: string }>(
      `INSERT INTO budget_periods (user_id, month_key, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise)
       VALUES ($1, $2, 500000, $3, 100000, 400000)
       RETURNING id`,
      [userId, currentMonthKey, `${currentMonthKey}-01`]
    );
    const periodId = periodRes.rows[0].id;

    // Past limit from 1st of month
    await dbClient.query(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, $2, 12000, 'auto')`,
      [periodId, `${currentMonthKey}-01`]
    );

    // Update limit preference to custom 15000
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/settings/daily-limit',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mode: 'custom',
        customLimitPaise: 15000
      }
    });
    expect(patchRes.statusCode).toBe(200);

    // Check daily_limit_settings: past entry must remain intact, new entry added
    const allLimits = await dbClient.query<{ effective_from: Date; limit_paise: string; mode: string }>(
      `SELECT effective_from, limit_paise, mode FROM daily_limit_settings WHERE budget_period_id = $1 ORDER BY effective_from ASC`,
      [periodId]
    );

    expect(allLimits.rows.length).toBe(2);
    expect(Number(allLimits.rows[0].limit_paise)).toBe(12000);
    expect(Number(allLimits.rows[1].limit_paise)).toBe(15000);
    expect(allLimits.rows[1].mode).toBe('custom');
  });
});
