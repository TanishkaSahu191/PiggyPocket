import pino from 'pino';

// Ensure sensitive fields are never printed in logs
const redactedPaths = [
  'req.headers.authorization',
  'req.headers["x-auth-token"]',
  'headers.authorization',
  'password',
  'otp',
  'token',
  'jwt_secret',
  'email_api_key',
  '*.password',
  '*.otp',
  '*.token'
];

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: redactedPaths,
    censor: '[REDACTED]'
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
