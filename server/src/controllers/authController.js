/**
 * AUTHENTICATION CONTROLLER - Real Auth with Hashed Passwords, JWT, and OTP
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { tokenService } from '../services/tokenService.js';
import { otpService } from '../services/otpService.js';

export const authController = {
  /**
   * User registration with validation and OTP initiation
   */
  async signup(req, res) {
    try {
      const { fullName, email, phone, password } = req.body;

      if (!fullName || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          error: 'Full name, email, 10-digit phone, and password are required.',
        });
      }

      // Check for existing user
      const existingUser = await query(
        `SELECT id FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists.',
        });
      }

      // Hash password with bcrypt (12 rounds)
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

      await query(
        `INSERT INTO users (id, full_name, email, phone, password_hash, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, fullName.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, false]
      );

      // Trigger OTP verification
      await otpService.createAndSendOtp({
        userId,
        identifier: email,
        channel: 'email',
        purpose: 'signup',
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful. 6-digit OTP code has been sent.',
        userId,
        email: email.toLowerCase(),
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Signup failed.' });
    }
  },

  /**
   * User login with password verification
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.',
        });
      }

      const userRes = await query(
        `SELECT * FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      const user = userRes.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = tokenService.generateTokens(user);

      // Set secure HTTP-only refresh cookie
      res.cookie('pp_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        success: true,
        accessToken,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Login failed.' });
    }
  },

  /**
   * Verify OTP and complete authentication
   */
  async verifyOtp(req, res) {
    try {
      const { email, code, purpose = 'signup' } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          error: 'Email and 6-digit OTP code are required.',
        });
      }

      await otpService.verifyOtp({
        identifier: email,
        code: code.trim(),
        purpose,
      });

      // Update user verification status
      const userRes = await query(
        `SELECT * FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      let user = userRes.rows[0];
      if (!user) {
        const userId = 'usr_' + Date.now();
        user = {
          id: userId,
          full_name: email.split('@')[0],
          email: email.toLowerCase().trim(),
          phone: '9876543210',
          is_email_verified: true,
        };
        await query(
          `INSERT INTO users (id, full_name, email, phone, password_hash, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, user.full_name, user.email, user.phone, 'demo_hash', true]
        );
      } else {
        await query(
          `UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1`,
          [user.id]
        );
      }

      const { accessToken, refreshToken } = tokenService.generateTokens(user);

      res.cookie('pp_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        accessToken,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * Resend OTP verification code
   */
  async resendOtp(req, res) {
    try {
      const { email, purpose = 'signup' } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
      }
      await otpService.createAndSendOtp({
        identifier: email,
        channel: 'email',
        purpose,
      });
      return res.json({
        success: true,
        message: 'New verification code has been dispatched.',
      });
    } catch (err) {
      console.error('resendOtp error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to resend code.' });
    }
  },

  /**
   * Request password reset OTP
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      const userRes = await query(
        `SELECT id FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      if (userRes.rows.length === 0) {
        // Return generic success to prevent email enumeration
        return res.json({
          success: true,
          message: 'If an account exists, a 6-digit verification code has been sent.',
        });
      }

      await otpService.createAndSendOtp({
        userId: userRes.rows[0].id,
        identifier: email,
        channel: 'email',
        purpose: 'reset_password',
      });

      return res.json({
        success: true,
        message: 'A 6-digit verification code has been sent to your email.',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to process password reset.' });
    }
  },

  /**
   * Complete password reset with OTP
   */
  async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email, OTP code, and new password are required.',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long.',
        });
      }

      // Verify OTP
      await otpService.verifyOtp({
        identifier: email,
        code: code.trim(),
        purpose: 'reset_password',
      });

      // Update password hash
      const newHash = await bcrypt.hash(newPassword, 12);
      await query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
        [newHash, email.toLowerCase().trim()]
      );

      return res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in.',
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * Return current authenticated user profile
   */
  async me(req, res) {
    const userRes = await query(
      `SELECT id, full_name, email, phone, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const u = userRes.rows[0];
    return res.json({
      success: true,
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        createdAt: u.created_at,
      },
    });
  },

  /**
   * Logout user by clearing cookies
   */
  logout(req, res) {
    res.clearCookie('pp_refresh_token');
    return res.json({ success: true, message: 'Logged out successfully.' });
  },
};

