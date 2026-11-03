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
   * Sends OTP via Resend API or console fallback.
   */
  async sendEmailOtp(email, otp, purpose) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: email,
            subject: `PiggyPocket Verification Code: ${otp}`,
            text: `Your PiggyPocket verification code for ${purpose} is: ${otp}. It will expire in 10 minutes.`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-bottom: 8px;">PiggyPocket Verification</h2>
                <p style="color: #475569; font-size: 14px;">Use the verification code below to complete your ${purpose}:</p>
                <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #0f172a; padding: 14px; background: #f8fafc; text-align: center; border-radius: 6px; margin: 16px 0;">
                  ${otp}
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.warn('Resend API error:', errData);
          this.logDevFallback('EMAIL', email, otp);
        }
      } catch (err) {
        console.warn('Resend dispatch failed:', err.message);
        this.logDevFallback('EMAIL', email, otp);
      }
    } else {
      this.logDevFallback('EMAIL', email, otp);
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
    const res = await query(
      `SELECT * FROM otp_verifications
       WHERE identifier = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [identifier.toLowerCase(), purpose]
    );

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

