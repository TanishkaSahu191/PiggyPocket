/**
 * AUTHENTICATION MIDDLEWARE - JWT Verification & Row-Level User Isolation
 */

import { tokenService } from '../services/tokenService.js';

export function authenticateUser(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.pp_access_token) {
      token = req.cookies.pp_access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No active session token found.',
      });
    }

    const payload = tokenService.verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      fullName: payload.fullName,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
}

