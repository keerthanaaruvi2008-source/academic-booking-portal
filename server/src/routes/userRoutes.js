/**
 * @fileoverview Express Router for User endpoints.
 * Provides authenticated profile retrieval and role-protected operations.
 */

import { Router } from 'express';
import { getMe, checkAdmin } from '../controllers/userController.js';
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/rbac.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Authenticated user profile
router.get('/me', authenticate, getMe);

// Admin-only smoke test check endpoint
router.get('/admin-check', authenticate, requireRole([ROLES.ADMIN]), checkAdmin);

export default router;
