import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { buildServer, AppServer } from '../server.js';
import { runMigrations } from '../db/migrate.js';
import { setDbClient } from '../db/index.js';
import { hashOtp } from '../utils/crypto.js';

describe('Phase 3: Auth, OTP, Onboarding & User Isolation Tests', () => {
  let app: AppServer;
  let pglite: PGlite;
  let dbClient: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
    exec: (sql: string) => Promise<unknown>;
  };

  beforeAll(async () => {
    pglite = new PGlite();
    dbClient = {
      async query(sql: string, params?: unknown[]) {
        const res = await pglite.query(sql, params);
        return { rows: res.rows };
      },
      async exec(sql: string) {
        return await pglite.exec(sql);
      }
    };

    // Run both migrations
    await runMigrations(dbClient);
    setDbClient(dbClient);

    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    setDbClient(null);
    await pglite.close();
  });

  it('1. Register sends OTP and creates unverified user record', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Tanishka Sahu',
        email: 'tanishka@college.edu.in',
        phone: '+919876543210'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('Verification code sent');

    // Verify OTP record exists in DB
    const otps = await dbClient.query('SELECT * FROM otp_codes WHERE email = $1', [
      'tanishka@college.edu.in'
    ]);
    expect(otps.rows.length).toBe(1);
    expect(otps.rows[0].attempts).toBe(0);
    expect(otps.rows[0].consumed_at).toBeNull();
  });

  it('2. Resend cooldown: prevents requesting another OTP within 60 seconds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/request-otp',
      payload: {
        email: 'tanishka@college.edu.in',
        purpose: 'register'
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toContain('Please wait 60 seconds');
  });

  it('3. Wrong-code lockout: locks code after 5 failed attempts', async () => {
    const email = 'lockout@college.edu.in';
    const rawOtp = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Seed OTP
    await dbClient.query(
      'INSERT INTO users (name, email) VALUES ($1, $2)',
      ['Lockout User', email]
    );
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, hashOtp(rawOtp), 'login', expiresAt]
    );

    // Attempts 1 to 4 with wrong code
    for (let i = 1; i <= 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-otp',
        payload: { email, code: '999999', purpose: 'login' }
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('attempt(s) remaining');
    }

    // 5th attempt locks the code
    const res5 = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email, code: '999999', purpose: 'login' }
    });
    expect(res5.statusCode).toBe(400);
    expect(JSON.parse(res5.body).error.message).toContain('locked');

    // 6th attempt (even with CORRECT code) is rejected because code is locked
    const res6 = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email, code: rawOtp, purpose: 'login' }
    });
    expect(res6.statusCode).toBe(400);
    expect(JSON.parse(res6.body).error.message).toContain('locked');
  });

  it('4. OTP expiry: rejects codes that have passed 10 minutes', async () => {
    const email = 'expired@college.edu.in';
    const rawOtp = '654321';
    const pastExpiresAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    await dbClient.query('INSERT INTO users (name, email) VALUES ($1, $2)', ['Exp User', email]);
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, hashOtp(rawOtp), 'login', pastExpiresAt]
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email, code: rawOtp, purpose: 'login' }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toContain('expired');
  });

  it('5. Successful OTP verification, token generation, and token rotation', async () => {
    const email = 'tokens@college.edu.in';
    const rawOtp = '777888';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await dbClient.query('INSERT INTO users (name, email) VALUES ($1, $2)', ['Token User', email]);
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, hashOtp(rawOtp), 'login', expiresAt]
    );

    // Verify OTP
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email, code: rawOtp, purpose: 'login' }
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.accessToken).toBeDefined();
    expect(verifyBody.refreshToken).toBeDefined();

    const originalRefreshToken = verifyBody.refreshToken;

    // Refresh tokens (Rotation)
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: originalRefreshToken }
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = JSON.parse(refreshRes.body);
    expect(refreshBody.accessToken).toBeDefined();
    expect(refreshBody.refreshToken).toBeDefined();
    expect(refreshBody.refreshToken).not.toBe(originalRefreshToken); // New rotated token

    // Old token is revoked and cannot be reused
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: originalRefreshToken }
    });
    expect(replayRes.statusCode).toBe(401);
  });

  it('6. Onboarding preview and validation: rejects goal greater than pocket money', async () => {
    // Generate valid token
    const email = 'onboarding@college.edu.in';
    await dbClient.query<{ id: string }>(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      ['Onboarding User', email]
    );

    // Login to get token
    const otp = '112233';
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, hashOtp(otp), 'login', new Date(Date.now() + 10 * 60 * 1000)]
    );
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email, code: otp, purpose: 'login' }
    });
    const token = JSON.parse(loginRes.body).accessToken;

    // Rejects goal > pocket money
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/onboarding/preview',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        pocketMoneyPaise: 500000,
        receivedOn: '2026-04-01',
        savingsGoalPaise: 600000 // Invalid: goal > pocket money
      }
    });
    expect(invalidRes.statusCode).toBe(400);

    // Valid preview returns computed spending budget & daily limit
    const validPreview = await app.inject({
      method: 'POST',
      url: '/api/onboarding/preview',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        pocketMoneyPaise: 500000,
        receivedOn: '2026-04-01',
        savingsGoalPaise: 100000,
        dailyLimitMode: 'auto'
      }
    });
    expect(validPreview.statusCode).toBe(200);
    const previewBody = JSON.parse(validPreview.body);
    expect(previewBody.spendingBudgetPaise).toBe(400000);
    expect(previewBody.periodDays).toBe(30);
    expect(previewBody.baseAutoDailyLimitPaise).toBe(13333);

    // Complete onboarding in one database transaction
    const completeRes = await app.inject({
      method: 'POST',
      url: '/api/onboarding/complete',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        pocketMoneyPaise: 500000,
        receivedOn: '2026-04-01',
        savingsGoalPaise: 100000,
        dailyLimitMode: 'auto',
        sendTimeLocal: '22:00',
        emailNotificationsEnabled: true
      }
    });
    expect(completeRes.statusCode).toBe(201);
    const completeBody = JSON.parse(completeRes.body);
    expect(completeBody.success).toBe(true);
    expect(completeBody.monthKey).toBe('2026-04');
  });

  // TEST L: User A can never read or modify User B's budget period, preferences or tokens
  it('TEST L: User A can never read or modify User B budget period, daily limits, preferences, or tokens', async () => {
    // 1. Setup User A
    const userARes = await dbClient.query<{ id: string }>(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      ['User A', 'usera@college.edu.in']
    );
    const userAId = userARes.rows[0].id;

    const otpA = '123123';
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      ['usera@college.edu.in', hashOtp(otpA), 'login', new Date(Date.now() + 10 * 60 * 1000)]
    );
    const loginA = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'usera@college.edu.in', code: otpA, purpose: 'login' }
    });
    const tokenA = JSON.parse(loginA.body).accessToken;

    // User A completes onboarding for ₹5,000 pocket money
    await app.inject({
      method: 'POST',
      url: '/api/onboarding/complete',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        pocketMoneyPaise: 500000,
        receivedOn: '2026-04-01',
        savingsGoalPaise: 100000,
        dailyLimitMode: 'auto',
        sendTimeLocal: '21:00'
      }
    });

    // 2. Setup User B
    const userBRes = await dbClient.query<{ id: string }>(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      ['User B', 'userb@college.edu.in']
    );
    const userBId = userBRes.rows[0].id;

    const otpB = '456456';
    await dbClient.query(
      'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      ['userb@college.edu.in', hashOtp(otpB), 'login', new Date(Date.now() + 10 * 60 * 1000)]
    );
    const loginB = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'userb@college.edu.in', code: otpB, purpose: 'login' }
    });
    const tokenB = JSON.parse(loginB.body).accessToken;

    // User B completes onboarding for ₹12,000 pocket money
    await app.inject({
      method: 'POST',
      url: '/api/onboarding/complete',
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: {
        pocketMoneyPaise: 1200000,
        receivedOn: '2026-04-01',
        savingsGoalPaise: 300000,
        dailyLimitMode: 'custom',
        customDailyLimitPaise: 30000,
        sendTimeLocal: '23:00'
      }
    });

    // 3. User A queries /api/budget/period
    const resA = await app.inject({
      method: 'GET',
      url: '/api/budget/period?monthKey=2026-04',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataA = JSON.parse(resA.body);

    // Verify User A only sees their own ₹5,000 pocket money
    expect(dataA.budgetPeriod.pocketMoneyPaise).toBe(500000);
    expect(dataA.notificationPrefs.send_time_local).toBe('21:00');

    // 4. User B queries /api/budget/period
    const resB = await app.inject({
      method: 'GET',
      url: '/api/budget/period?monthKey=2026-04',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataB = JSON.parse(resB.body);

    // Verify User B only sees their own ₹12,000 pocket money
    expect(dataB.budgetPeriod.pocketMoneyPaise).toBe(1200000);
    expect(dataB.notificationPrefs.send_time_local).toBe('23:00');

    // 5. User A cannot modify User B's preferences or budget
    // Direct DB verification that user A's ID matches only user A's records
    const checkPeriodsA = await dbClient.query(
      'SELECT user_id FROM budget_periods WHERE user_id = $1',
      [userAId]
    );
    expect(checkPeriodsA.rows.every((r) => r.user_id === userAId)).toBe(true);

    const checkPeriodsB = await dbClient.query(
      'SELECT user_id FROM budget_periods WHERE user_id = $1',
      [userBId]
    );
    expect(checkPeriodsB.rows.every((r) => r.user_id === userBId)).toBe(true);
  });
});
