/**
 * @fileoverview Authentication controller handling HTTP request parsing, cookie management, and envelope response formatting.
 */

import { HTTP_STATUS } from '../config/constants.js';
import * as authService from '../services/authService.js';
import asyncHandler from '../utils/asyncHandler.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Attaches the refresh token to the response as a secure, httpOnly cookie.
 * @param {import('express').Response} res
 * @param {string} token - JWT refresh token.
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  });
};

/**
 * Clears the refresh token httpOnly cookie.
 * @param {import('express').Response} res
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

/**
 * Handles user registration with optional OTP verification.
 * @route POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, otp } = req.body;

  const result = await authService.registerUser({
    name,
    email,
    password,
    role,
    department,
    otp,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Handles user login.
 * @route POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.loginUser({
    email,
    password,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Handles dispatching a 6-digit OTP to user's email.
 * @route POST /api/v1/auth/send-otp
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email, name, purpose } = req.body;

  const result = await authService.sendVerificationOtp({
    email,
    name,
    purpose,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      message: `A 6-digit verification code has been dispatched to ${result.email}.`,
      email: result.email,
      expiresInSeconds: result.expiresInSeconds,
      otp: result.otp,
      devOtp: result.otp,
    },
  });
});

/**
 * Handles verifying an OTP code and authenticating user.
 * @route POST /api/v1/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const result = await authService.verifyOtpAndLogin({
    email,
    otp,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      message: 'Email successfully verified.',
    },
  });
});

/**
 * Handles token refresh using cookie or request body.
 * @route POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  const result = await authService.refreshTokens(refreshToken);

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Handles user logout and cookie clearing.
 * @route POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  clearRefreshTokenCookie(res);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});
