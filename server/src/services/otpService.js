/**
 * @fileoverview OTP Generation & Verification Service.
 * Manages secure 6-digit one-time passwords for email verification and authentication.
 */

import { sendOtpEmail } from './emailService.js';
import AppError from '../utils/appError.js';
import { HTTP_STATUS } from '../config/constants.js';

// In-memory OTP storage map: email -> { otp, expiresAt, attempts, name, purpose, verifiedAt }
const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/**
 * Generates a 6-digit numeric OTP and dispatches it to the recipient email.
 *
 * @param {string} email - Recipient institutional email (e.g. 310625243103@eec.srmrmp.edu.in).
 * @param {string} [name='Student'] - User name.
 * @param {string} [purpose='Account Registration'] - Purpose of verification.
 * @returns {Promise<{ success: boolean, email: string, expiresInSeconds: number }>}
 */
export const generateAndSendOtp = async (email, name = 'Student', purpose = 'Account Registration') => {
  if (!email || !email.includes('@')) {
    throw new AppError('A valid email address is required to generate OTP.', HTTP_STATUS.BAD_REQUEST, 'INVALID_EMAIL');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  otpStore.set(normalizedEmail, {
    otp,
    expiresAt,
    attempts: 0,
    name,
    purpose,
    verifiedAt: null,
  });

  console.log(`[OTP Service] 🔑 Generated 6-digit OTP for email: ${normalizedEmail} (Expires in 10 mins)`);

  // Dispatch email to recipient
  await sendOtpEmail(normalizedEmail, otp, name, purpose);

  return {
    success: true,
    email: normalizedEmail,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    otp,
  };
};

/**
 * Validates a user-provided 6-digit OTP against the active OTP store.
 *
 * @param {string} email - Institutional email.
 * @param {string} enteredOtp - 6-digit candidate code.
 * @returns {boolean} True if verification succeeded.
 * @throws {AppError} If OTP is invalid, expired, or max attempts exceeded.
 */
export const verifyOtp = (email, enteredOtp) => {
  if (!email || !enteredOtp) {
    throw new AppError('Email and 6-digit OTP are required.', HTTP_STATUS.BAD_REQUEST, 'MISSING_OTP');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    throw new AppError(
      'No active verification code found for this email. Please request a new code.',
      HTTP_STATUS.BAD_REQUEST,
      'OTP_NOT_FOUND'
    );
  }

  // If verified within the last 60 seconds (handling double-clicks/race conditions)
  if (record.verifiedAt && Date.now() - record.verifiedAt < 60000) {
    return true;
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    throw new AppError(
      'Verification code has expired. Please request a new code.',
      HTTP_STATUS.BAD_REQUEST,
      'OTP_EXPIRED'
    );
  }

  // Check brute-force attempts
  record.attempts += 1;
  if (record.attempts > MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    throw new AppError(
      'Too many incorrect verification attempts. Please request a new code.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'TOO_MANY_ATTEMPTS'
    );
  }

  // Check match
  if (record.otp !== enteredOtp.toString().trim()) {
    const remaining = MAX_ATTEMPTS - record.attempts;
    throw new AppError(
      `Invalid verification code. ${remaining} attempt(s) remaining.`,
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_OTP'
    );
  }

  // Successfully verified: mark verified timestamp and schedule clean deletion
  record.verifiedAt = Date.now();
  setTimeout(() => {
    otpStore.delete(normalizedEmail);
  }, 60000);

  return true;
};

export default {
  generateAndSendOtp,
  verifyOtp,
};
