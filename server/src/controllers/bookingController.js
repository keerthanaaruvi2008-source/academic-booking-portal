/**
 * @fileoverview Booking HTTP controller handlers.
 * Translates HTTP requests into booking domain operations and wraps results in standard response envelopes.
 */

import {
  createBooking,
  getBookingById,
  listBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  deleteBooking,
} from '../services/bookingService.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Creates a new reservation.
 * POST /api/v1/bookings
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const create = async (req, res, next) => {
  try {
    const booking = await createBooking(req.body, req.user);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single reservation by ID.
 * GET /api/v1/bookings/:id
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getById = async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists reservations with filters and pagination.
 * GET /api/v1/bookings
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const list = async (req, res, next) => {
  try {
    const { bookings, pagination } = await listBookings(req.query, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        bookings,
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approves a reservation (Admin only).
 * PATCH /api/v1/bookings/:id/approve
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const approve = async (req, res, next) => {
  try {
    const booking = await approveBooking(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        booking,
        message: 'Reservation approved successfully.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rejects a reservation (Admin only).
 * PATCH /api/v1/bookings/:id/reject
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const reject = async (req, res, next) => {
  try {
    const booking = await rejectBooking(req.params.id, req.body.rejectionReason, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        booking,
        message: 'Reservation rejected.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancels a reservation (Owner or Admin).
 * PATCH /api/v1/bookings/:id/cancel
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const cancel = async (req, res, next) => {
  try {
    const booking = await cancelBooking(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        booking,
        message: 'Reservation cancelled successfully.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently deletes a reservation (Admin only).
 * DELETE /api/v1/bookings/:id
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const remove = async (req, res, next) => {
  try {
    const result = await deleteBooking(req.params.id, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
