import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dbQuery } from '../db/index.js';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken
} from '../utils/crypto.js';
import { validateWithZod, BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { getMailer } from '../services/mailer/index.js';
import { authenticate } from '../middleware/auth.js';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  timezone: string;
  email_verified_at: string | null;
}

interface OtpRecord {
  id: string;
  email: string;
  code_hash: string;
  purpose: string;
  expires_at: Date;
  attempts: number;
  consumed_at: Date | null;
  created_at: Date;
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required').toLowerCase(),
  phone: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata')
});

const requestOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  purpose: z.enum(['register', 'login']).default('login')
});

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['register', 'login']).default('login')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. REGISTER
  app.post('/register', async (req, reply) => {
    const data = validateWithZod(registerSchema, req.body);

    // Check if user already exists
    const existing = await dbQuery<UserRecord>('SELECT * FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0 && existing.rows[0].email_verified_at) {
      // Generic response to prevent user enumeration
      return reply.send({
        message: 'If you do not already have an account, an OTP has been sent to your email.'
      });
    }

    let user: UserRecord;
    if (existing.rows.length > 0) {
      // User created earlier but unverified: update name/phone/timezone
      const updated = await dbQuery<UserRecord>(
        `UPDATE users SET name = $1, phone = $2, timezone = $3, updated_at = CURRENT_TIMESTAMP
         WHERE email = $4 RETURNING *`,
        [data.name, data.phone || null, data.timezone, data.email]
      );
      user = updated.rows[0];
    } else {
      // Insert new unverified user
      const inserted = await dbQuery<UserRecord>(
        `INSERT INTO users (name, email, phone, timezone)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.name, data.email, data.phone || null, data.timezone]
      );
      user = inserted.rows[0];
    }

    // Generate & send OTP
    await sendOtpForEmail(user.email, 'register');

    return reply.status(200).send({
      message: 'Verification code sent to your email.'
    });
  });

  // 2. REQUEST-OTP
  app.post('/request-otp', async (req, reply) => {
    const data = validateWithZod(requestOtpSchema, req.body);

    // If purpose is login, check user exists
    if (data.purpose === 'login') {
      const user = await dbQuery('SELECT id FROM users WHERE email = $1', [data.email]);
      if (user.rows.length === 0) {
        // Generic response to prevent account harvesting
        return reply.send({
          message: 'If an account matches this email, an OTP has been sent.'
        });
      }
    }

    await sendOtpForEmail(data.email, data.purpose || 'login');

    return reply.send({
      message: 'If an account matches this email, an OTP has been sent.'
    });
  });

  // 3. VERIFY-OTP
  app.post('/verify-otp', async (req, reply) => {
    const data = validateWithZod(verifyOtpSchema, req.body);

    // Fetch the latest active OTP for this email and purpose
    const otpResult = await dbQuery<OtpRecord>(
      `SELECT * FROM otp_codes
       WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [data.email, data.purpose]
    );

    if (otpResult.rows.length === 0) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    const otpRecord = otpResult.rows[0];

    // Check expiry (10 minutes)
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new BadRequestError('Verification code has expired. Please request a new one.');
    }

    // Check lockout (locks after 5 failed attempts)
    if (otpRecord.attempts >= 5) {
      throw new BadRequestError(
        'Too many failed attempts. This verification code is locked. Please request a new one.'
      );
    }

    // Constant-time hash verification
    const isValid = verifyOtpHash(data.code, otpRecord.code_hash);
    if (!isValid) {
      // Increment attempts
      await dbQuery('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);
      const remaining = 5 - (otpRecord.attempts + 1);
      if (remaining <= 0) {
        throw new BadRequestError('Too many failed attempts. This code is now locked.');
      }
      throw new BadRequestError(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark OTP as consumed
    await dbQuery('UPDATE otp_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1', [
      otpRecord.id
    ]);

    // Fetch or create user
    const userRes = await dbQuery<UserRecord>('SELECT * FROM users WHERE email = $1', [data.email]);
    if (userRes.rows.length === 0) {
      throw new BadRequestError('User record not found');
    }

    let user = userRes.rows[0];
    if (!user.email_verified_at) {
      const verified = await dbQuery<UserRecord>(
        'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [user.id]
      );
      user = verified.rows[0];
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await dbQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        timezone: user.timezone,
        emailVerifiedAt: user.email_verified_at
      },
      accessToken,
      refreshToken: rawRefreshToken
    });
  });

  // 4. LOGIN (email + OTP alias)
  app.post('/login', async (req, reply) => {
    // Delegates to verify-otp with purpose = 'login'
    return app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { ...(req.body as object), purpose: 'login' }
    }).then((res) => {
      reply.status(res.statusCode).headers(res.headers).send(res.body);
    });
  });

  // 5. REFRESH TOKEN (Rotating)
  app.post('/refresh', async (req, reply) => {
    const data = validateWithZod(refreshSchema, req.body);
    const incomingHash = hashRefreshToken(data.refreshToken);

    const tokenRes = await dbQuery<{ id: string; user_id: string; expires_at: Date }>(
      `SELECT id, user_id, expires_at FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [incomingHash]
    );

    if (tokenRes.rows.length === 0) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenRecord = tokenRes.rows[0];
    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Revoke old token
    await dbQuery('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [
      tokenRecord.id
    ]);

    // Fetch user
    const userRes = await dbQuery<UserRecord>('SELECT * FROM users WHERE id = $1', [
      tokenRecord.user_id
    ]);
    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User account not found');
    }

    const user = userRes.rows[0];

    // Rotate: Issue new refresh token & access token
    const newRawRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await dbQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, newHash, newExpiresAt]
    );

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email });

    return reply.send({
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    });
  });

  // 6. LOGOUT
  app.post('/logout', async (req, reply) => {
    const body = req.body as { refreshToken?: string } | undefined;
    if (body?.refreshToken) {
      const incomingHash = hashRefreshToken(body.refreshToken);
      await dbQuery(
        'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
        [incomingHash]
      );
    }
    return reply.send({ success: true });
  });

  // 7. ME (Authenticated User Profile & Budget Check)
  app.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = req.user!.id;

    const userRes = await dbQuery<UserRecord>('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }
    const user = userRes.rows[0];

    // Determine current month key YYYY-MM in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: user.timezone,
      year: 'numeric',
      month: '2-digit'
    });
    const monthKey = formatter.format(now).substring(0, 7);

    // Check if user has an existing budget period for this month
    const budgetRes = await dbQuery(
      'SELECT * FROM budget_periods WHERE user_id = $1 AND month_key = $2',
      [userId, monthKey]
    );

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        timezone: user.timezone,
        emailVerifiedAt: user.email_verified_at
      },
      currentMonthKey: monthKey,
      hasActiveBudget: budgetRes.rows.length > 0,
      currentBudget: budgetRes.rows[0] || null
    });
  });
};

/**
 * Helper to generate, store, and dispatch an OTP with cooldown enforcement.
 */
async function sendOtpForEmail(email: string, purpose: 'register' | 'login'): Promise<void> {
  // Check 60-second resend cooldown
  const recentOtp = await dbQuery<{ created_at: Date }>(
    `SELECT created_at FROM otp_codes
     WHERE email = $1 AND purpose = $2 AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );

  if (recentOtp.rows.length > 0) {
    throw new BadRequestError('Please wait 60 seconds before requesting another code.');
  }

  const rawOtp = generateOtp();
  const codeHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await dbQuery(
    `INSERT INTO otp_codes (email, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email, codeHash, purpose, expiresAt]
  );

  const mailer = getMailer();
  await mailer.sendOtp(email, rawOtp, purpose);
}
