/**
 * @fileoverview Async handler wrapper for Express controllers.
 * Eliminates repetitive try-catch blocks and forwards unhandled exceptions to error middleware.
 */

/**
 * Wraps an async route handler/middleware function to automatically catch errors and pass them to next().
 * @param {Function} fn - Async controller function.
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
