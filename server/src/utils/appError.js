/**
 * @fileoverview Custom application error class with HTTP status code and domain error code.
 */

/**
 * Custom operational error class for standardizing error responses.
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description.
   * @param {number} [statusCode=500] - HTTP status code.
   * @param {string} [code='INTERNAL_ERROR'] - Domain specific error code.
   * @param {object} [extraPayload={}] - Additional structured diagnostic fields.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', extraPayload = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.assign(this, extraPayload);

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
