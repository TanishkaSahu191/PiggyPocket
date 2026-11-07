import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/signup', authRateLimiter, authController.signup);
router.post('/login', authRateLimiter, authController.login);
router.post('/google', authRateLimiter, authController.googleAuth);
router.post('/verify-otp', otpRateLimiter, authController.verifyOtp);
router.post('/resend-otp', otpRateLimiter, authController.resendOtp);
router.post('/forgot-password', otpRateLimiter, authController.forgotPassword);
router.post('/reset-password', otpRateLimiter, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.me);

export default router;

