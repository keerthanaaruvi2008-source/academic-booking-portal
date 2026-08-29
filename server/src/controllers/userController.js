/**
 * @fileoverview User controller handling profile retrieval and user management operations.
 */

import { HTTP_STATUS } from '../config/constants.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Retrieves the currently authenticated user profile.
 * @route GET /api/v1/users/me
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Sample admin-restricted check endpoint for verifying RBAC guards.
 * @route GET /api/v1/users/admin-check
 */
export const checkAdmin = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      message: 'Admin access verified successfully.',
      user: req.user,
    },
  });
});
