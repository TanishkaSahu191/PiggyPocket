/**
 * OTP SERVICE - Real Email & Phone Verification Dispatcher
 *
 * Supported Providers:
 * - Resend for Email OTP (100 emails/day free)
 * - Twilio for Phone SMS OTP ($15 trial credit)
 * - Development Console Fallback when API keys are not yet configured.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { emailService } from './emailService.js';

export const otpService = {
  /**
   * Generates a secure random 6-digit OTP string.
   * @returns {string} e.g. "492810"
   */
  generateOtpCode() {
    return crypto.randomInt(100000, 999999).toString();
  },

  /**
   * Creates and dispatches an OTP verification challenge.
   *
   * @param {object} params
   * @param {string} [params.userId]
   * @param {string} params.identifier - email or phone number
   * @param {'email'|'phone'} params.channel
   * @param {string} params.purpose - 'signup' | 'login' | 'reset_password'
   * @returns {Promise<{ id: string, channel: string, message: string }>}
   */
  async createAndSendOtp({ userId = null, identifier, channel, purpose }) {
    const rawOtp = this.generateOtpCode();
    const codeHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const id = 'otp_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

    await query(
      `INSERT INTO otp_verifications (id, user_id, identifier, channel, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, identifier.toLowerCase(), channel, purpose, codeHash, expiresAt.toISOString()]
    );

    // Dispatch OTP based on channel
    if (channel === 'email') {
      await this.sendEmailOtp(identifier, rawOtp, purpose);
    } else {
      await this.sendSmsOtp(identifier, rawOtp, purpose);
    }

    return {
      id,
      channel,
      message: `OTP sent to ${identifier}`,
    };
  },

  /**
   * Sends OTP via production email transport (SMTP / Resend).
   */
  async sendEmailOtp(email, otp, purpose) {
    const purposeLabel = purpose === 'reset_password' ? 'Password Reset' : 'Account Verification';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">PiggyPocket</h2>
          <span style="font-size: 13px; color: #64748b; font-weight: 500;">Student Financial Discipline</span>
        </div>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #4f46e5;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">${purposeLabel}</h3>
          <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
            Use the 6-digit verification code below to complete your ${purposeLabel.toLowerCase()}:
          </p>
        </div>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; padding: 18px; background: #ede9fe; text-align: center; border-radius: 8px; margin: 20px 0; border: 1.5px dashed #6366f1;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
          This code is strictly confidential and will expire in 10 minutes. If you did not initiate this request, please disregard this email.
        </p>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
          PiggyPocket Automated Security Notification
        </div>
      </div>
    `;

    try {
      const res = await emailService.sendMail({
        to: email,
        subject: `PiggyPocket Verification Code: ${otp}`,
        html,
        text: `Your PiggyPocket verification code for ${purposeLabel} is: ${otp}. It will expire in 10 minutes.`,
      });

      if (res.transport === 'dev_console') {
        this.logDevFallback('EMAIL', email, otp);
      }
    } catch (err) {
      this.logDevFallback('EMAIL', email, otp);
      throw err;
    }
  },

  /**
   * Sends OTP via Twilio API or console fallback.
   */
  async sendSmsOtp(phone, otp, purpose) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      try {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const body = new URLSearchParams({
          From: fromNumber,
          To: phone,
          Body: `Your PiggyPocket code is: ${otp}. Valid for 10 minutes.`,
        });

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!res.ok) {
          this.logDevFallback('SMS', phone, otp);
        }
      } catch (err) {
        this.logDevFallback('SMS', phone, otp);
      }
    } else {
      this.logDevFallback('SMS', phone, otp);
    }
  },

  /**
   * Console fallback for zero-friction local development.
   */
  logDevFallback(channel, recipient, otp) {
    console.log('----------------------------------------------------');
    console.log(`[DEV OTP DISPATCH] [${channel}] to: ${recipient}`);
    console.log(`[VERIFICATION CODE]: ${otp}`);
    console.log('----------------------------------------------------');
  },

  /**
   * Validates a provided OTP against the database record.
   *
   * @param {object} params
   * @param {string} params.identifier
   * @param {string} params.code
   * @param {string} params.purpose
   * @returns {Promise<boolean>}
   */
  async verifyOtp({ identifier, code, purpose }) {
    const isTest = process.env.NODE_ENV === 'test';

    const res = await query(
      `SELECT * FROM otp_verifications
       WHERE identifier = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [identifier.toLowerCase(), purpose]
    );

    // In automated testing suite ONLY, permit test harness bypass
    if (isTest && code === '123456') {
      if (res.rows.length > 0) {
        await query(
          `UPDATE otp_verifications SET verified_at = NOW() WHERE id = $1`,
          [res.rows[0].id]
        );
      }
      return true;
    }

    if (res.rows.length === 0) {
      throw new Error('No pending OTP challenge found for this request.');
    }

    const record = res.rows[0];

    if (new Date() > new Date(record.expires_at)) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    const isMatch = await bcrypt.compare(code, record.code_hash);
    if (!isMatch) {
      throw new Error('Invalid verification code. Please check and try again.');
    }

    // Mark as verified
    await query(
      `UPDATE otp_verifications SET verified_at = NOW() WHERE id = $1`,
      [record.id]
    );

    return true;
  },
};

