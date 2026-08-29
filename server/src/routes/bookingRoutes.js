/**
 * @fileoverview Booking router.
 * Maps endpoints to booking controller methods with JWT authentication, RBAC, and Zod validation.
 */

import { Router } from 'express';
import {
  create,
  getById,
  list,
  approve,
  reject,
  cancel,
  remove,
} from '../controllers/bookingController.js';
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createBookingSchema,
  rejectBookingSchema,
  listBookingQuerySchema,
  bookingIdParamSchema,
} from '../validations/bookingValidation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// Create reservation (Students, Faculty, Admin)
router.post('/', validate(createBookingSchema, 'body'), create);

// List reservations (Scoped for students/faculty; global for admin)
router.get('/', validate(listBookingQuerySchema, 'query'), list);

// Retrieve single reservation details
router.get('/:id', validate(bookingIdParamSchema, 'params'), getById);

// Admin-only approval
router.patch(
  '/:id/approve',
  requireRole([ROLES.ADMIN]),
  validate(bookingIdParamSchema, 'params'),
  approve
);

// Admin-only rejection
router.patch(
  '/:id/reject',
  requireRole([ROLES.ADMIN]),
  validate(bookingIdParamSchema, 'params'),
  validate(rejectBookingSchema, 'body'),
  reject
);

// Cancel reservation (Owner or Admin)
router.patch('/:id/cancel', validate(bookingIdParamSchema, 'params'), cancel);

// Admin-only permanent deletion
router.delete(
  '/:id',
  requireRole([ROLES.ADMIN]),
  validate(bookingIdParamSchema, 'params'),
  remove
);

export default router;
