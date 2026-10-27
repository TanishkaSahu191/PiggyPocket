import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function generateOtp(): string {
  // Generate random 6-digit number string between 100000 and 999999
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashString(input: string, salt: string = env.JWT_SECRET): string {
  return crypto.createHmac('sha256', salt).update(input).digest('hex');
}

export function hashOtp(otp: string): string {
  return hashString(otp, env.JWT_SECRET);
}

export function verifyOtpHash(candidateOtp: string, storedHash: string): boolean {
  const candidateHash = hashOtp(candidateOtp);
  if (candidateHash.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash));
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Signs a standard HMAC-SHA256 JWT access token (15 minute expiration).
 */
export function signAccessToken(
  payload: { userId: string; email: string },
  expiresInSeconds: number = 900 // 15 minutes
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a JWT access token using constant-time comparison and expiration check.
 */
export function verifyAccessToken(token: string): { userId: string; email: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) {
    throw new Error('Invalid token signature');
  }

  const validSig = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!validSig) {
    throw new Error('Invalid token signature');
  }

  const payload: AccessTokenPayload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  );

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token has expired');
  }

  return { userId: payload.userId, email: payload.email };
}
