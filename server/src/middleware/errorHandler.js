/**
 * @fileoverview Centralized error handling middleware.
 * Formats errors (AppError, Mongoose validation/cast, Mongo duplicate key, JWT, syntax)
 * into a consistent JSON response envelope.
 */

import { HTTP_STATUS } from '../config/constants.js';

/**
 * Global Express error handling middleware.
 *
 * @type {import('express').ErrorRequestHandler}
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  const isProduction = process.env.NODE_ENV === 'production';

  // MongoDB duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = 'INVALID_ID_FORMAT';
    message = `Invalid format for field '${err.path}': ${err.value}`;
  }

  // JWT invalid signature or malformed token
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = 'INVALID_TOKEN';
    message = 'Authentication token is invalid.';
  }

  // JWT expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired.';
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl} (${statusCode}) - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isProduction && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
        ? 'Internal Server Error'
        : message,
      code,
      ...(err.conflictingBookingId ? { conflictingBookingId: err.conflictingBookingId } : {}),
      ...(err.suggestedSlots ? { suggestedSlots: err.suggestedSlots } : {}),
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
};

export default errorHandler;
