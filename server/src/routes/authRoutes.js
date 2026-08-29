/**
 * @fileoverview Express Router for Authentication endpoints.
 * Routes handle user registration, login, token refresh, OTP generation, OTP verification, and logout.
 */

import { Router } from 'express';
import { register, login, refresh, logout, sendOtp, verifyOtp } from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema } from '../validations/authValidation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/send-otp', authLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/refresh', refresh);
router.post('/refresh-token', refresh);
router.post('/logout', logout);

export default router;
