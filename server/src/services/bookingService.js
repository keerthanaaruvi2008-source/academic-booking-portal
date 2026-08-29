/**
 * @fileoverview Booking domain service.
 * Handles reservation lifecycle: creation, retrieval, role-scoped queries, administrative approval/rejection,
 * and user cancellation.
 */

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { executeAtomicBookingCreation, checkBookingOverlap } from './bookingConflictService.js';
import {
  BOOKING_STATUS,
  HTTP_STATUS,
  PAGINATION,
  ROLES,
} from '../config/constants.js';
import AppError from '../utils/appError.js';
import { memStore } from '../utils/inMemoryStore.js';

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Creates a new reservation wrapped in conflict prevention and transaction isolation.
 *
 * @param {object} bookingData - { resourceId, title, description, startTime, endTime }
 * @param {object} user - Authenticated user.
 * @returns {Promise<import('../models/Booking.js').default>}
 */
export const createBooking = async (bookingData, user) => {
  return executeAtomicBookingCreation(bookingData, user);
};

/**
 * Retrieves a single reservation by ID with ownership/admin authorization check.
 *
 * @param {string} bookingId - Booking ObjectId string.
 * @param {object} user - Authenticated user requesting the booking.
 * @returns {Promise<import('../models/Booking.js').default>}
 * @throws {AppError} 404 if not found, 403 if unauthorized.
 */
export const getBookingById = async (bookingId, user) => {
  if (!isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const booking = memStore.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
    }
    const ownerId = booking.bookedBy?._id?.toString() || booking.bookedBy?.toString();
    if (user.role !== ROLES.ADMIN && ownerId !== user._id.toString()) {
      throw new AppError(
        'You are not authorized to view this booking.',
        HTTP_STATUS.FORBIDDEN,
        'INSUFFICIENT_PERMISSIONS'
      );
    }
    return booking;
  }

  const booking = await Booking.findById(bookingId)
    .populate('resourceId', 'name type location capacity')
    .populate('bookedBy', 'name email role department')
    .populate('approvedBy', 'name email role');

  if (!booking) {
    throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
  }

  // Authorization: Admins can view any booking; regular users can only view their own
  const ownerId = booking.bookedBy?._id?.toString() || booking.bookedBy?.toString();
  if (user.role !== ROLES.ADMIN && ownerId !== user._id.toString()) {
    throw new AppError(
      'You are not authorized to view this booking.',
      HTTP_STATUS.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  return booking;
};

/**
 * Lists reservations with role-scoped querying, pagination, and multi-criteria filters.
 *
 * @param {object} [params={}]
 * @param {number|string} [params.page] - Page number (default: 1).
 * @param {number|string} [params.limit] - Page limit (default: 20, max: 100).
 * @param {string} [params.status] - Status filter (pending, approved, rejected, cancelled).
 * @param {string} [params.resourceId] - Filter by specific resource.
 * @param {string} [params.userId] - Filter by specific user (admin only).
 * @param {string|Date} [params.startDate] - Start time boundary.
 * @param {string|Date} [params.endDate] - End time boundary.
 * @param {string} [params.sortBy='startTime'] - Field to sort by.
 * @param {string|number} [params.sortOrder='desc'] - Sort direction.
 * @param {object} user - Authenticated user.
 * @returns {Promise<{ bookings: object[], pagination: object }>}
 */
export const listBookings = async (params = {}, user) => {
  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    let list = [...memStore.getBookings()];
    if (user.role !== ROLES.ADMIN) {
      list = list.filter((b) => {
        const bookedById = (b.bookedBy?._id || b.bookedBy)?.toString();
        const bookedByEmail = b.bookedBy?.email;
        const userEmail = user.email;
        return (
          bookedById === user._id.toString() ||
          (bookedByEmail && userEmail && bookedByEmail.toLowerCase() === userEmail.toLowerCase())
        );
      });
    } else if (params.userId) {
      list = list.filter((b) => (b.bookedBy?._id || b.bookedBy)?.toString() === params.userId.toString());
    }
    if (params.status) {
      list = list.filter((b) => b.status === params.status);
    }
    if (params.resourceId) {
      list = list.filter((b) => (b.resourceId?._id || b.resourceId)?.toString() === params.resourceId.toString());
    }
    return {
      bookings: list,
      pagination: {
        total: list.length,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const page = Math.max(1, parseInt(params.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(params.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  const query = {};

  // Role scoping: Non-admins can ONLY view their own bookings
  if (user.role !== ROLES.ADMIN) {
    query.bookedBy = user._id;
  } else if (params.userId) {
    query.bookedBy = params.userId;
  }

  if (params.status) {
    query.status = params.status;
  }

  if (params.resourceId) {
    query.resourceId = params.resourceId;
  }

  if (params.startDate || params.endDate) {
    query.startTime = {};
    if (params.startDate) {
      query.startTime.$gte = new Date(params.startDate);
    }
    if (params.endDate) {
      query.startTime.$lte = new Date(params.endDate);
    }
  }

  const sortBy = params.sortBy || 'startTime';
  const sortDirection = params.sortOrder === 'asc' || params.sortOrder === 1 ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  const [total, bookings] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query)
      .populate('resourceId', 'name type location capacity')
      .populate('bookedBy', 'name email role department')
      .populate('approvedBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Approves a pending reservation (Admin only).
 *
 * @param {string} bookingId - Booking ObjectId string.
 * @param {object} adminUser - Authenticated admin user.
 * @returns {Promise<import('../models/Booking.js').default>}
 */
export const approveBooking = async (bookingId, adminUser) => {
  if (!isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (adminUser.role !== ROLES.ADMIN) {
    throw new AppError('Only administrators can approve reservations.', HTTP_STATUS.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const booking = memStore.getBookingById(bookingId);
    if (!booking) throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
    booking.status = BOOKING_STATUS.APPROVED;
    booking.approvedBy = adminUser;
    return booking;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
  }

  if (booking.status === BOOKING_STATUS.APPROVED) {
    return Booking.findById(bookingId)
      .populate('resourceId', 'name type location capacity')
      .populate('bookedBy', 'name email role department')
      .populate('approvedBy', 'name email role');
  }

  if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.REJECTED) {
    throw new AppError(
      `Cannot approve a reservation that is already ${booking.status}.`,
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Re-verify no approved booking overlaps this slot
  const overlaps = await checkBookingOverlap(
    booking.resourceId,
    booking.startTime,
    booking.endTime,
    booking._id
  );

  const approvedOverlaps = overlaps.filter((o) => o.status === BOOKING_STATUS.APPROVED);
  if (approvedOverlaps.length > 0) {
    throw new AppError(
      'Cannot approve this reservation because an approved booking already occupies this slot.',
      HTTP_STATUS.CONFLICT,
      'BOOKING_CONFLICT',
      { conflictingBookingId: approvedOverlaps[0]._id }
    );
  }

  booking.status = BOOKING_STATUS.APPROVED;
  booking.approvedBy = adminUser._id;
  booking.rejectionReason = null;
  await booking.save();

  return Booking.findById(booking._id)
    .populate('resourceId', 'name type location capacity')
    .populate('bookedBy', 'name email role department')
    .populate('approvedBy', 'name email role');
};

/**
 * Rejects a reservation with documented reason (Admin only).
 *
 * @param {string} bookingId - Booking ObjectId string.
 * @param {string} rejectionReason - Explanation for rejection.
 * @param {object} adminUser - Authenticated admin user.
 * @returns {Promise<import('../models/Booking.js').default>}
 */
export const rejectBooking = async (bookingId, rejectionReason, adminUser) => {
  if (!isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (adminUser.role !== ROLES.ADMIN) {
    throw new AppError('Only administrators can reject reservations.', HTTP_STATUS.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const booking = memStore.getBookingById(bookingId);
    if (!booking) throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
    booking.status = BOOKING_STATUS.REJECTED;
    booking.rejectionReason = rejectionReason;
    booking.approvedBy = adminUser;
    return booking;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw new AppError('Cannot reject a cancelled reservation.', HTTP_STATUS.BAD_REQUEST, 'INVALID_STATUS_TRANSITION');
  }

  booking.status = BOOKING_STATUS.REJECTED;
  booking.approvedBy = adminUser._id;
  booking.rejectionReason = rejectionReason?.trim() || 'Reservation request rejected by administrator.';
  await booking.save();

  return Booking.findById(booking._id)
    .populate('resourceId', 'name type location capacity')
    .populate('bookedBy', 'name email role department')
    .populate('approvedBy', 'name email role');
};

/**
 * Cancels a reservation (Owner or Admin).
 *
 * @param {string} bookingId - Booking ObjectId string.
 * @param {object} user - Authenticated user.
 * @returns {Promise<import('../models/Booking.js').default>}
 */
export const cancelBooking = async (bookingId, user) => {
  if (!isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const booking = memStore.getBookingById(bookingId);
    if (!booking) throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
    booking.status = BOOKING_STATUS.CANCELLED;
    return booking;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
  }

  const ownerId = booking.bookedBy?._id?.toString() || booking.bookedBy?.toString();
  if (user.role !== ROLES.ADMIN && ownerId !== user._id.toString()) {
    throw new AppError(
      'You are only authorized to cancel your own reservations.',
      HTTP_STATUS.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw new AppError('Reservation is already cancelled.', HTTP_STATUS.BAD_REQUEST, 'BOOKING_ALREADY_CANCELLED');
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  await booking.save();

  return Booking.findById(booking._id)
    .populate('resourceId', 'name type location capacity')
    .populate('bookedBy', 'name email role department')
    .populate('approvedBy', 'name email role');
};

/**
 * Permanently deletes a reservation from the system (Admin only).
 *
 * @param {string} bookingId - Booking ObjectId string.
 * @param {object} user - Authenticated user.
 * @returns {Promise<{ message: string, id: string }>}
 */
export const deleteBooking = async (bookingId, user) => {
  if (!isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (user.role !== ROLES.ADMIN) {
    throw new AppError(
      'Only administrators can permanently delete reservations.',
      HTTP_STATUS.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const deleted = memStore.deleteBooking(bookingId);
    if (!deleted) {
      throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
    }
    return {
      message: 'Reservation deleted successfully.',
      id: bookingId,
    };
  }

  const booking = await Booking.findByIdAndDelete(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', HTTP_STATUS.NOT_FOUND, 'BOOKING_NOT_FOUND');
  }

  return {
    message: 'Reservation deleted successfully.',
    id: bookingId,
  };
};
