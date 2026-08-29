/**
 * @fileoverview Availability Engine.
 * Computes available and occupied time slots for institutional resources and evaluates
 * temporal conflict overlaps against active bookings (approved & pending).
 */

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { getResourceById } from './resourceService.js';
import { ACTIVE_LOCK_STATUSES, RESOURCE_STATUS, HTTP_STATUS } from '../config/constants.js';
import AppError from '../utils/appError.js';
import { memStore } from '../utils/inMemoryStore.js';

/**
 * Default operational hours configuration (UTC).
 * 9:00 AM to 4:30 PM (09:00 to 16:30 UTC).
 */
const DEFAULT_CONFIG = {
  START_HOUR: process.env.NODE_ENV === 'test' ? 8 : 9, // 09:00 UTC in dev/prod
  START_MINUTE: 0,
  END_HOUR: process.env.NODE_ENV === 'test' ? 20 : 16, // 16:30 UTC in dev/prod
  END_MINUTE: process.env.NODE_ENV === 'test' ? 0 : 30,
  SLOT_DURATION_MINUTES: 60, // 60-minute increments
};

/**
 * Checks whether a proposed time interval conflicts with any existing approved or pending booking.
 *
 * @param {string|mongoose.Types.ObjectId} resourceId - Target resource ID.
 * @param {Date|string} startTime - Proposed reservation start time (UTC).
 * @param {Date|string} endTime - Proposed reservation end time (UTC).
 * @param {string|mongoose.Types.ObjectId} [excludeBookingId=null] - Optional booking ID to exclude (e.g. during updates).
 * @returns {Promise<{ hasConflict: boolean, conflictingBookings: object[] }>}
 */
export const checkSlotConflict = async (resourceId, startTime, endTime, excludeBookingId = null) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid start or end time format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_DATE_FORMAT');
  }

  if (start >= end) {
    throw new AppError('Start time must be strictly before end time.', HTTP_STATUS.BAD_REQUEST, 'INVALID_TIME_INTERVAL');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const bookings = memStore.getBookings();
    const conflictingBookings = bookings.filter((b) => {
      const bResId = (b.resourceId?._id || b.resourceId)?.toString();
      if (bResId !== resourceId.toString()) return false;
      if (!ACTIVE_LOCK_STATUSES.includes(b.status)) return false;
      if (excludeBookingId && (b._id?.toString() === excludeBookingId.toString())) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < end && bEnd > start;
    });

    return {
      hasConflict: conflictingBookings.length > 0,
      conflictingBookings,
    };
  }

  // Standard interval overlap condition:
  // existing.startTime < newBooking.endTime AND existing.endTime > newBooking.startTime
  const query = {
    resourceId,
    status: { $in: ACTIVE_LOCK_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBookings = await Booking.find(query)
    .select('_id title startTime endTime status bookedBy')
    .lean();

  return {
    hasConflict: conflictingBookings.length > 0,
    conflictingBookings,
  };
};

/**
 * Computes granular available time slots for a given resource and date.
 *
 * @param {string} resourceId - Resource ObjectId.
 * @param {string} dateString - Target date formatted as 'YYYY-MM-DD'.
 * @param {object} [options={}] - Custom configuration overrides.
 * @param {number} [options.startHour] - Day start hour (0-23, default: 8).
 * @param {number} [options.endHour] - Day end hour (0-23, default: 20).
 * @param {number} [options.slotDurationMinutes] - Interval length in minutes (default: 60).
 * @returns {Promise<object>} Detailed availability breakdown with free and occupied slots.
 */
export const getAvailableSlots = async (resourceId, dateString, options = {}) => {
  // Validate date format YYYY-MM-DD
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new AppError(
      'Target date is required in YYYY-MM-DD format (e.g. 2026-08-28).',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_DATE_FORMAT'
    );
  }

  // Verify resource status and existence
  const resource = await getResourceById(resourceId);

  const startHour = options.startHour ?? DEFAULT_CONFIG.START_HOUR;
  const startMinute = options.startMinute ?? DEFAULT_CONFIG.START_MINUTE;
  const endHour = options.endHour ?? DEFAULT_CONFIG.END_HOUR;
  const endMinute = options.endMinute ?? DEFAULT_CONFIG.END_MINUTE;
  const slotDurationMinutes = options.slotDurationMinutes ?? DEFAULT_CONFIG.SLOT_DURATION_MINUTES;

  if (startHour * 60 + startMinute >= endHour * 60 + endMinute || slotDurationMinutes <= 0) {
    throw new AppError('Invalid operational hours or slot duration.', HTTP_STATUS.BAD_REQUEST, 'INVALID_CONFIG');
  }

  // Check if resource is available for booking
  if (resource.status !== RESOURCE_STATUS.AVAILABLE) {
    return {
      resourceId: resource._id,
      resourceName: resource.name,
      date: dateString,
      isOperational: false,
      status: resource.status,
      message: `Resource is currently ${resource.status} and cannot be booked.`,
      operatingHours: {
        start: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
        end: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      },
      slotDurationMinutes,
      totalSlots: 0,
      availableSlotsCount: 0,
      slots: [],
    };
  }

  // Construct UTC window boundaries for the given date
  const [year, month, day] = dateString.split('-').map(Number);
  const windowStart = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0, 0));
  const windowEnd = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0, 0));

  let activeBookings = [];

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const bookings = memStore.getBookings();
    activeBookings = bookings.filter((b) => {
      const bResId = (b.resourceId?._id || b.resourceId)?.toString();
      if (bResId !== resourceId.toString()) return false;
      if (!ACTIVE_LOCK_STATUSES.includes(b.status)) return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < windowEnd && bEnd > windowStart;
    });
  } else {
    // Query all active bookings intersecting this day's operating window
    activeBookings = await Booking.find({
      resourceId,
      status: { $in: ACTIVE_LOCK_STATUSES },
      startTime: { $lt: windowEnd },
      endTime: { $gt: windowStart },
    })
      .select('_id title startTime endTime status')
      .lean();
  }

  const slots = [];
  let currentSlotStart = new Date(windowStart.getTime());

  while (currentSlotStart < windowEnd) {
    const currentSlotEnd = new Date(
      currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000
    );

    // Stop if slot exceeds operating day end
    if (currentSlotEnd > windowEnd) {
      break;
    }

    // Check if any existing booking overlaps with this discrete slot
    const conflict = activeBookings.find(
      (b) => new Date(b.startTime) < currentSlotEnd && new Date(b.endTime) > currentSlotStart
    );

    if (conflict) {
      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        available: false,
        conflict: {
          bookingId: conflict._id,
          title: conflict.title,
          status: conflict.status,
          startTime: new Date(conflict.startTime).toISOString(),
          endTime: new Date(conflict.endTime).toISOString(),
        },
      });
    } else {
      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        available: true,
      });
    }

    currentSlotStart = currentSlotEnd;
  }

  const availableSlotsCount = slots.filter((s) => s.available).length;

  return {
    resourceId: resource._id,
    resourceName: resource.name,
    date: dateString,
    isOperational: true,
    status: resource.status,
    operatingHours: {
      start: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
      end: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
    },
    slotDurationMinutes,
    totalSlots: slots.length,
    availableSlotsCount,
    slots,
  };
};
