import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface Mailer {
  sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: ConsoleMailer refuses to run when NODE_ENV=production');
    }

    // Clearly labeled DEV mode console output
    console.log('\n=============================================================');
    console.log(`[DEV MODE AUTH] ONE-TIME PASSWORD (OTP)`);
    console.log(`Recipient : ${to}`);
    console.log(`Purpose   : ${purpose.toUpperCase()}`);
    console.log(`OTP Code  : >>> ${otp} <<<`);
    console.log(`Valid for : 10 minutes (Single use only)`);
    console.log('=============================================================\n');
  }
}

export class BrevoMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to, purpose }, 'Brevo API key not configured. Falling back to logger.');
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.EMAIL_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'Smart Budget Tracker', email: env.EMAIL_FROM },
        to: [{ email: to }],
        subject: `Your ${purpose === 'register' ? 'Registration' : 'Login'} OTP Code: ${otp}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10B981;">PiggyPocket OTP Verification</h2>
            <p>Your one-time password for ${purpose} is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background-color: #f1f5f9; text-align: center; border-radius: 8px;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 16px;">
              This code will expire in 10 minutes. If you did not request this, please ignore this email.
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, 'Failed to send Brevo OTP email');
      throw new Error('Failed to send verification email via Brevo');
    }
  }
}

export class ResendMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to, purpose }, 'Resend API key not configured. Falling back to logger.');
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.EMAIL_API_KEY}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject: `Your ${purpose === 'register' ? 'Registration' : 'Login'} OTP Code: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
            <h2 style="color: #10B981;">PiggyPocket Verification</h2>
            <p>Your OTP code is:</p>
            <h1 style="letter-spacing: 4px;">${otp}</h1>
            <p>Expires in 10 minutes.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, 'Failed to send Resend OTP email');
      throw new Error('Failed to send verification email via Resend');
    }
  }
}

let customMailer: Mailer | null = null;

export function setMailer(mailer: Mailer | null): void {
  customMailer = mailer;
}

export function getMailer(): Mailer {
  if (customMailer) {
    return customMailer;
  }
  // In development and test, use ConsoleMailer
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return new ConsoleMailer();
  }
  if (env.EMAIL_PROVIDER === 'resend') {
    return new ResendMailer();
  }
  return new BrevoMailer();
}
