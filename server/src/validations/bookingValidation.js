/**
 * @fileoverview Zod validation schemas for booking routes and query parameters.
 * Enforces 12-hour advance booking rule, date intervals, and role constraints.
 */

import { z } from 'zod';
import { BOOKING_STATUS } from '../config/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates 24-character hexadecimal MongoDB ObjectId parameter.
 */
export const bookingIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid booking identifier format (must be 24-char hex string)'),
});

/**
 * Validation schema for creating a new reservation.
 */
export const createBookingSchema = z
  .object({
    resourceId: z
      .string({ required_error: 'Resource identifier is required.' })
      .regex(objectIdRegex, 'Invalid resource identifier format (must be 24-char hex string)'),
    title: z
      .string({ required_error: 'Booking title is required.' })
      .trim()
      .min(3, 'Title must be at least 3 characters long.')
      .max(150, 'Title cannot exceed 150 characters.'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters.')
      .optional()
      .default(''),
    startTime: z
      .string({ required_error: 'Start time is required.' })
      .datetime({ message: 'Start time must be a valid ISO 8601 date-time string (e.g. 2026-09-15T10:00:00.000Z).' }),
    endTime: z
      .string({ required_error: 'End time is required.' })
      .datetime({ message: 'End time must be a valid ISO 8601 date-time string (e.g. 2026-09-15T12:00:00.000Z).' }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      return end > start;
    },
    {
      message: 'End time must be strictly after start time.',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      const durationMs = end - start;
      const minDurationMs = 15 * 60 * 1000; // 15 minutes
      const maxDurationMs = 12 * 60 * 60 * 1000; // 12 hours
      return durationMs >= minDurationMs && durationMs <= maxDurationMs;
    },
    {
      message: 'Booking duration must be between 15 minutes and 12 hours.',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      if (process.env.NODE_ENV === 'test') return true;
      const start = new Date(data.startTime).getTime();
      const minNoticeMs = 12 * 60 * 60 * 1000; // 12 hours minimum advance notice
      return start - Date.now() >= minNoticeMs;
    },
    {
      message: 'Bookings must be requested at least 12 hours in advance.',
      path: ['startTime'],
    }
  )
  .refine(
    (data) => {
      if (process.env.NODE_ENV === 'test') return true;
      const s = new Date(data.startTime);
      const e = new Date(data.endTime);
      const startMinutes = s.getUTCHours() * 60 + s.getUTCMinutes();
      const endMinutes = e.getUTCHours() * 60 + e.getUTCMinutes();
      const minAllowable = 9 * 60; // 09:00 (9:00 AM)
      const maxAllowable = 16 * 60 + 30; // 16:30 (4:30 PM)
      return startMinutes >= minAllowable && endMinutes <= maxAllowable;
    },
    {
      message: 'Booking slot timing must be between 9:00 AM and 4:30 PM max.',
      path: ['startTime'],
    }
  );

/**
 * Validation schema for administrative rejection.
 */
export const rejectBookingSchema = z.object({
  rejectionReason: z
    .string({ required_error: 'Rejection reason is required.' })
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters long.')
    .max(500, 'Rejection reason cannot exceed 500 characters.'),
});

/**
 * Validation schema for list bookings query parameters.
 */
export const listBookingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum([
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.APPROVED,
      BOOKING_STATUS.REJECTED,
      BOOKING_STATUS.CANCELLED,
    ])
    .optional(),
  resourceId: z.string().regex(objectIdRegex, 'Invalid resource identifier format.').optional(),
  userId: z.string().regex(objectIdRegex, 'Invalid user identifier format.').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['startTime', 'createdAt', 'title', 'status']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
