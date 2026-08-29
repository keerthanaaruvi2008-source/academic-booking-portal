/**
 * @fileoverview Authentication domain service.
 * Handles JWT token generation, signature validation, user registration, credential verification, and token rotation.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { HTTP_STATUS } from '../config/constants.js';
import AppError from '../utils/appError.js';
import { memStore } from '../utils/inMemoryStore.js';

/**
 * Generates a short-lived access JWT for authenticated API requests.
 * @param {import('../models/User.js').default} user
 * @returns {string} Signed JWT access token.
 */
export const generateAccessToken = (user) => {
  const secret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secret_key_12345';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '24h';

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Generates a long-lived refresh JWT for rotating credentials.
 * @param {import('../models/User.js').default} user
 * @returns {string} Signed JWT refresh token.
 */
export const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secret_key_67890';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Verifies the authenticity and expiration of an access JWT.
 * @param {string} token - Signed JWT access token string.
 * @returns {object} Decoded JWT payload.
 * @throws {AppError} If token is invalid, expired, or malformed.
 */
export const verifyAccessToken = (token) => {
  const secret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secret_key_12345';

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired', HTTP_STATUS.UNAUTHORIZED, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
  }
};

/**
 * Verifies the authenticity and expiration of a refresh JWT.
 * @param {string} token - Signed JWT refresh token string.
 * @returns {object} Decoded JWT payload.
 * @throws {AppError} If token is invalid or expired.
 */
export const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secret_key_67890';

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired', HTTP_STATUS.UNAUTHORIZED, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');
  }
};

/**
 * Registers a new user in the system and issues auth tokens.
 * @param {object} params
 * @param {string} params.name - Full name.
 * @param {string} params.email - Unique email address.
 * @param {string} params.password - Plain text password.
 * @param {string} [params.role] - User role (student/faculty/admin).
 * @param {string} [params.department] - Academic department.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
import { generateAndSendOtp, verifyOtp } from './otpService.js';
import { isValidRoleEmail, ALLOWED_ADMIN_EMAIL, INSTITUTIONAL_DOMAIN } from '../validations/authValidation.js';

/**
 * Registers a new user in the system with optional OTP verification.
 *
 * @param {object} params
 * @param {string} params.name - User's full name.
 * @param {string} params.email - User's institutional email address.
 * @param {string} params.password - Plain text password.
 * @param {string} [params.role='student'] - User role (student, faculty, admin).
 * @param {string} [params.department] - Academic department.
 * @param {string} [params.otp] - Optional 6-digit OTP to verify during registration.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export const registerUser = async ({ name, email, password, role, department, otp }) => {
  if (!email || !password || !name) {
    throw new AppError('Name, email, and password are required', HTTP_STATUS.BAD_REQUEST, 'MISSING_FIELDS');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userRole = role || 'student';

  if (!isValidRoleEmail(normalizedEmail, userRole)) {
    if (userRole === 'admin') {
      throw new AppError(
        'Not a valid mail ID. Only authorized administrator email can register as Admin.',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_ADMIN_EMAIL'
      );
    }
    throw new AppError(
      `Not a valid mail ID. Student and faculty emails must end with ${INSTITUTIONAL_DOMAIN}`,
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_INSTITUTIONAL_EMAIL'
    );
  }

  // If OTP was provided, verify it before creating account
  if (otp) {
    verifyOtp(normalizedEmail, otp);
  }

  if (process.env.NODE_ENV === 'test' || mongoose.connection.readyState === 1) {
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new AppError(
        'A user with this email address already exists',
        HTTP_STATUS.CONFLICT,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: password, // Pre-save hook in User model will hash this
      role,
      department,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  // In-Memory store fallback
  const existing = memStore.getUserByEmail(normalizedEmail);
  if (existing) {
    if (otp) {
      const passwordHash = await bcrypt.hash(password, 10);
      existing.passwordHash = passwordHash;
      if (name) existing.name = name;
      if (role) existing.role = role;
      if (department) existing.department = department;
      memStore.saveToDisk();

      const accessToken = generateAccessToken(existing);
      const refreshToken = generateRefreshToken(existing);
      return { user: existing, accessToken, refreshToken };
    }
    throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = memStore.addUser({
    _id: Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
    name,
    email: normalizedEmail,
    passwordHash,
    role: role || 'student',
    department: department || 'Computer Science',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comparePassword: async function (cand) {
      return bcrypt.compare(cand, this.passwordHash);
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

/**
 * Sends a 6-digit verification code to the specified email.
 */
export const sendVerificationOtp = async ({ email, name, purpose }) => {
  return generateAndSendOtp(email, name, purpose);
};

/**
 * Verifies a 6-digit OTP and authenticates the user.
 */
export const verifyOtpAndLogin = async ({ email, otp }) => {
  const normalizedEmail = email.toLowerCase().trim();
  verifyOtp(normalizedEmail, otp);

  let user = null;
  if (process.env.NODE_ENV === 'test' || (mongoose.connection && mongoose.connection.readyState === 1)) {
    try {
      user = await User.findOne({ email: normalizedEmail, isActive: true });
    } catch {
      // fallback
    }
  }

  if (!user) {
    user = memStore.getUserByEmail(normalizedEmail);
  }

  if (!user) {
    throw new AppError('User not found. Please complete registration.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

/**
 * Authenticates a user with email and password, issuing fresh tokens.
 * @param {object} params
 * @param {string} params.email - User email.
 * @param {string} params.password - Plain text password.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', HTTP_STATUS.BAD_REQUEST, 'MISSING_CREDENTIALS');
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = null;
  if (process.env.NODE_ENV === 'test' || (mongoose.connection && mongoose.connection.readyState === 1)) {
    try {
      user = await User.findOne({ email: normalizedEmail, isActive: true });
    } catch {
      // fallback
    }
  }

  if (!user) {
    user = memStore.getUserByEmail(normalizedEmail);
  }

  if (!user) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Validates a refresh token and generates a new token pair (token rotation).
 * @param {string} refreshToken - Active refresh token.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', HTTP_STATUS.UNAUTHORIZED, 'MISSING_REFRESH_TOKEN');
  }

  const decoded = verifyRefreshToken(refreshToken);
  let user;

  if (process.env.NODE_ENV === 'test' || mongoose.connection.readyState === 1) {
    user = await User.findOne({ _id: decoded.id, isActive: true });
  } else {
    user = memStore.getUserById(decoded.id);
  }

  if (!user) {
    throw new AppError('User account not found or deactivated', HTTP_STATUS.UNAUTHORIZED, 'USER_NOT_FOUND');
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
