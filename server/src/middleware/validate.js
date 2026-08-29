/**
 * @fileoverview Reusable request validation middleware using Zod schemas.
 * Validates request body, query params, or route parameters at the route boundary before controller execution.
 */

import { HTTP_STATUS } from '../config/constants.js';
import AppError from '../utils/appError.js';

/**
 * Creates an Express middleware to validate request data against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @param {'body'|'query'|'params'} [source='body'] - Property on Express Request to validate.
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source] || {};
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const formattedErrors = result.error.errors
        .map((err) => `${err.path.join('.') || source}: ${err.message}`)
        .join('; ');

      return next(
        new AppError(formattedErrors, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
      );
    }

    // Replace request data with parsed, coerced, and sanitized result
    req[source] = result.data;
    next();
  };
};

export default validate;
