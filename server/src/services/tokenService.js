/**
 * JWT TOKEN SERVICE - Short-lived access JWT + Refresh Token
 */

import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_piggypocket_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_piggypocket_2026';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

export const tokenService = {
  /**
   * Generates access and refresh tokens for a user.
   * @param {{ id: string, email: string, fullName: string }} user
   * @returns {{ accessToken: string, refreshToken: string }}
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName || user.full_name,
    };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

    return { accessToken, refreshToken };
  },

  /**
   * Verifies access token.
   * @param {string} token
   * @returns {object} payload
   */
  verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
  },

  /**
   * Verifies refresh token.
   * @param {string} token
   * @returns {object} payload
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
  },
};

