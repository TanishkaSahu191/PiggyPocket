/**
 * EMAIL DISPATCH SERVICE - Production SMTP & API Transporter
 *
 * Supports:
 * 1. Nodemailer SMTP (e.g. Gmail App Password, Brevo, Mailgun, Amazon SES, or custom SMTP)
 * 2. Resend REST API (100 free emails/day)
 * 3. Graceful fallback logging with actionable setup instructions when credentials are not yet set in .env
 */

import nodemailer from 'nodemailer';

let smtpTransporter = null;

/**
 * Initializes or returns the cached Nodemailer SMTP transporter.
 */
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!user || !pass) {
    return null;
  }

  if (smtpTransporter) {
    return smtpTransporter;
  }

  const isGmail = (host && host.includes('gmail.com')) || (user && user.toLowerCase().endsWith('@gmail.com'));

  if (isGmail) {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  } else {
    smtpTransporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return smtpTransporter;
}

export const emailService = {
  /**
   * Dispatches an email to the specified recipient via SMTP or Resend API.
   *
   * @param {object} params
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject line
   * @param {string} params.html - Clean HTML body
   * @param {string} [params.text] - Plain text fallback
   * @returns {Promise<{ success: boolean, transport: string, messageId?: string }>}
   */
  async sendMail({ to, subject, html, text }) {
    const cleanTo = (to || '').trim().toLowerCase();
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'onboarding@resend.dev';

    // 1. Try Nodemailer SMTP (e.g. Gmail App Password, Brevo)
    const transporter = getTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: cleanTo,
          subject,
          text: text || subject,
          html,
        });

        console.log(`[EMAIL DISPATCH] Successfully sent email to ${cleanTo} via SMTP (Message ID: ${info.messageId})`);
        return {
          success: true,
          transport: 'smtp',
          messageId: info.messageId,
        };
      } catch (smtpErr) {
        console.error(`[EMAIL DISPATCH] SMTP failed for ${cleanTo}:`, smtpErr.message);
        throw new Error(`Failed to deliver email to ${cleanTo} via SMTP: ${smtpErr.message}`);
      }
    }

    // 2. Try Resend REST API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey.trim() !== '') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: cleanTo,
            subject,
            html,
            text: text || subject,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Resend API rejected delivery');
        }

        const data = await response.json();
        console.log(`[EMAIL DISPATCH] Successfully sent email to ${cleanTo} via Resend (ID: ${data.id})`);
        return {
          success: true,
          transport: 'resend',
          messageId: data.id,
        };
      } catch (resendErr) {
        console.error(`[EMAIL DISPATCH] Resend failed for ${cleanTo}:`, resendErr.message);
        throw new Error(`Failed to deliver email to ${cleanTo} via Resend: ${resendErr.message}`);
      }
    }

    // 3. Fallback when credentials are not yet configured in server/.env
    console.log('----------------------------------------------------');
    console.log('[EMAIL DISPATCH NOTICE]');
    console.log(`Intended recipient: ${cleanTo}`);
    console.log(`Subject: ${subject}`);
    console.log('To send real emails directly to inboxes:');
    console.log('Configure SMTP_USER & SMTP_PASS (Gmail App Password) or RESEND_API_KEY in server/.env');
    console.log('----------------------------------------------------');

    return {
      success: true,
      transport: 'dev_console',
      notice: 'Credentials not configured in server/.env. Logged to console.',
    };
  },
};
