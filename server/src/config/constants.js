/**
 * @fileoverview Application-wide constants and enumerations.
 * All domain enums and standard defaults are defined here to eliminate magic strings across the codebase.
 */

/**
 * User roles supported across the application.
 * @readonly
 * @enum {string}
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
});

/**
 * Array of valid user role values.
 * @type {readonly string[]}
 */
export const ROLE_LIST = Object.freeze(Object.values(ROLES));

/**
 * Booking status states.
 * @readonly
 * @enum {string}
 */
export const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

/**
 * Array of valid booking status values.
 * @type {readonly string[]}
 */
export const BOOKING_STATUS_LIST = Object.freeze(Object.values(BOOKING_STATUS));

/**
 * Statuses that actively reserve/lock a resource time slot.
 * @type {readonly string[]}
 */
export const ACTIVE_LOCK_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.APPROVED,
]);

/**
 * Resource categories.
 * @readonly
 * @enum {string}
 */
export const RESOURCE_TYPES = Object.freeze({
  SEMINAR_HALL: 'seminar_hall',
  LAB: 'lab',
  CLASSROOM: 'classroom',
  AUDITORIUM: 'auditorium',
  EQUIPMENT: 'equipment',
});

/**
 * Array of valid resource type values.
 * @type {readonly string[]}
 */
export const RESOURCE_TYPE_LIST = Object.freeze(Object.values(RESOURCE_TYPES));

/**
 * Operational statuses for resources.
 * @readonly
 * @enum {string}
 */
export const RESOURCE_STATUS = Object.freeze({
  AVAILABLE: 'available',
  MAINTENANCE: 'maintenance',
  UNAVAILABLE: 'unavailable',
});

/**
 * Array of valid resource status values.
 * @type {readonly string[]}
 */
export const RESOURCE_STATUS_LIST = Object.freeze(Object.values(RESOURCE_STATUS));

/**
 * Pagination defaults and constraints.
 * @readonly
 */
export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

/**
 * Standard HTTP Status Codes used in API responses.
 * @readonly
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
});
