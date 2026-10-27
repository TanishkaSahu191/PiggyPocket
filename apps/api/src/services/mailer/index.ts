import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailerResult {
  messageId: string;
}

export interface Mailer {
  sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void>;
  sendEmail(options: SendEmailOptions): Promise<MailerResult>;
}

export class ConsoleMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: ConsoleMailer refuses to run when NODE_ENV=production');
    }

    console.log('\n=============================================================');
    console.log(`[DEV MODE AUTH] ONE-TIME PASSWORD (OTP)`);
    console.log(`Recipient : ${to}`);
    console.log(`Purpose   : ${purpose.toUpperCase()}`);
    console.log(`OTP Code  : >>> ${otp} <<<`);
    console.log(`Valid for : 10 minutes (Single use only)`);
    console.log('=============================================================\n');
  }

  async sendEmail(options: SendEmailOptions): Promise<MailerResult> {
    if (env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: ConsoleMailer refuses to run when NODE_ENV=production');
    }

    const messageId = `console-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log('\n=============================================================');
    console.log(`[DEV MODE MAILER] EMAIL DISPATCHED`);
    console.log(`To        : ${options.to}`);
    console.log(`Subject   : ${options.subject}`);
    console.log(`MessageId : ${messageId}`);
    console.log(`---------------- Plain Text Preview ----------------`);
    console.log(options.text);
    console.log('=============================================================\n');
    return { messageId };
  }
}

export class BrevoMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to, purpose }, 'Brevo API key not configured. Falling back to ConsoleMailer.');
      return new ConsoleMailer().sendOtp(to, otp, purpose);
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.EMAIL_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'PiggyPocket Budget', email: env.EMAIL_FROM },
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
      throw new Error(`Failed to send verification email via Brevo (${response.status}): ${errorText}`);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<MailerResult> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to: options.to }, 'Brevo API key not configured. Falling back to ConsoleMailer.');
      return new ConsoleMailer().sendEmail(options);
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.EMAIL_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'PiggyPocket Daily Summary', email: env.EMAIL_FROM },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'Failed to send Brevo email');
      throw new Error(`Brevo send failed (${response.status}): ${errText}`);
    }

    const resData = (await response.json()) as { messageId?: string };
    return { messageId: resData.messageId || `brevo-${Date.now()}` };
  }
}

export class ResendMailer implements Mailer {
  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to, purpose }, 'Resend API key not configured. Falling back to ConsoleMailer.');
      return new ConsoleMailer().sendOtp(to, otp, purpose);
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
      throw new Error(`Failed to send verification email via Resend (${response.status}): ${errorText}`);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<MailerResult> {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder')) {
      logger.warn({ to: options.to }, 'Resend API key not configured. Falling back to ConsoleMailer.');
      return new ConsoleMailer().sendEmail(options);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.EMAIL_API_KEY}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'Failed to send Resend email');
      throw new Error(`Resend send failed (${response.status}): ${errText}`);
    }

    const resData = (await response.json()) as { id?: string };
    return { messageId: resData.id || `resend-${Date.now()}` };
  }
}

export class FakeMailer implements Mailer {
  public sentEmails: Array<SendEmailOptions & { messageId: string }> = [];
  public sentOtps: Array<{ to: string; otp: string; purpose: string }> = [];
  public shouldFail = false;
  public failureError = new Error('Simulated mailer failure');

  async sendOtp(to: string, otp: string, purpose: 'register' | 'login'): Promise<void> {
    if (this.shouldFail) throw this.failureError;
    this.sentOtps.push({ to, otp, purpose });
  }

  async sendEmail(options: SendEmailOptions): Promise<MailerResult> {
    if (this.shouldFail) throw this.failureError;
    const messageId = `fake-${Date.now()}-${this.sentEmails.length + 1}`;
    this.sentEmails.push({ ...options, messageId });
    return { messageId };
  }

  reset(): void {
    this.sentEmails = [];
    this.sentOtps = [];
    this.shouldFail = false;
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
  // In development and test, use ConsoleMailer unless explicitly overridden
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return new ConsoleMailer();
  }
  if (env.EMAIL_PROVIDER === 'resend') {
    return new ResendMailer();
  }
  return new BrevoMailer();
}
