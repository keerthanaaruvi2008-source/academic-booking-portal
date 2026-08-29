/**
 * @fileoverview Express Router for Resource management endpoints.
 * Configures authentication and role-based access control guards for resources.
 */

import { Router } from 'express';
import {
  create,
  getById,
  list,
  update,
  remove,
  getAvailability,
} from '../controllers/resourceController.js';
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createResourceSchema,
  updateResourceSchema,
  listResourceQuerySchema,
  resourceIdParamSchema,
  availabilityQuerySchema,
} from '../validations/resourceValidation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Public / Authenticated read routes (students, faculty, admin)
router.get('/', authenticate, validate(listResourceQuerySchema, 'query'), list);
router.get('/:id', authenticate, validate(resourceIdParamSchema, 'params'), getById);
router.get(
  '/:id/availability',
  authenticate,
  validate(resourceIdParamSchema, 'params'),
  validate(availabilityQuerySchema, 'query'),
  getAvailability
);

// Admin-only write routes
router.post(
  '/',
  authenticate,
  requireRole([ROLES.ADMIN]),
  validate(createResourceSchema, 'body'),
  create
);
router.put(
  '/:id',
  authenticate,
  requireRole([ROLES.ADMIN]),
  validate(resourceIdParamSchema, 'params'),
  validate(updateResourceSchema, 'body'),
  update
);
router.delete(
  '/:id',
  authenticate,
  requireRole([ROLES.ADMIN]),
  validate(resourceIdParamSchema, 'params'),
  remove
);

export default router;
