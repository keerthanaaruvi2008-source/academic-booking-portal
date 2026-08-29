/**
 * @fileoverview Role-Based Access Control (RBAC) middleware for Express routes.
 * Enforces declarative role permissions on API endpoints.
 */

import { HTTP_STATUS } from '../config/constants.js';
import AppError from '../utils/appError.js';

/**
 * Higher-order middleware factory that restricts route access to specific roles.
 * Must be placed after the authentication middleware in the pipeline.
 *
 * @param {string|string[]} allowedRoles - Single role or array of authorized roles.
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required before role verification.',
          HTTP_STATUS.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
          HTTP_STATUS.FORBIDDEN,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

export default requireRole;
