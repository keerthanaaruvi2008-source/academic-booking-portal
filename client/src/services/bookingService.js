/**
 * @fileoverview Booking API service wrappers for frontend components.
 * Interfaces with the /api/v1/bookings endpoints via the centralized Axios client.
 */

import api from './api.js';

/**
 * Creates a new reservation request.
 *
 * @param {object} bookingData
 * @param {string} bookingData.resourceId - Resource ObjectId string.
 * @param {string} bookingData.title - Reservation title.
 * @param {string} [bookingData.description] - Reservation details.
 * @param {string} bookingData.startTime - ISO 8601 string.
 * @param {string} bookingData.endTime - ISO 8601 string.
 * @returns {Promise<{ success: boolean, data: { booking: object } }>}
 */
export const createBooking = async (bookingData) => {
  return api.post('/bookings', bookingData);
};

/**
 * Fetches paginated reservations with query filters.
 *
 * @param {object} [params={}]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.status]
 * @param {string} [params.resourceId]
 * @param {string} [params.userId]
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {string} [params.sortBy]
 * @param {string} [params.sortOrder]
 * @returns {Promise<{ success: boolean, data: { bookings: object[], pagination: object } }>}
 */
export const fetchBookings = async (params = {}) => {
  return api.get('/bookings', { params });
};

/**
 * Fetches a single reservation by ID.
 *
 * @param {string} id - Booking ObjectId string.
 * @returns {Promise<{ success: boolean, data: { booking: object } }>}
 */
export const fetchBookingById = async (id) => {
  return api.get(`/bookings/${id}`);
};

/**
 * Approves a pending reservation (Admin only).
 *
 * @param {string} id - Booking ObjectId string.
 * @returns {Promise<{ success: boolean, data: { booking: object, message: string } }>}
 */
export const approveBooking = async (id) => {
  return api.patch(`/bookings/${id}/approve`);
};

/**
 * Rejects a reservation with a reason (Admin only).
 *
 * @param {string} id - Booking ObjectId string.
 * @param {string} rejectionReason - Justification for rejection.
 * @returns {Promise<{ success: boolean, data: { booking: object, message: string } }>}
 */
export const rejectBooking = async (id, rejectionReason) => {
  return api.patch(`/bookings/${id}/reject`, { rejectionReason });
};

/**
 * Cancels a reservation (Owner or Admin).
 *
 * @param {string} id - Booking ObjectId string.
 * @returns {Promise<{ success: boolean, data: { booking: object, message: string } }>}
 */
export const cancelBooking = async (id) => {
  return api.patch(`/bookings/${id}/cancel`);
};

/**
 * Permanently deletes a reservation (Admin only).
 *
 * @param {string} id - Booking ObjectId string.
 * @returns {Promise<{ success: boolean, data: { message: string, id: string } }>}
 */
export const deleteBooking = async (id) => {
  return api.delete(`/bookings/${id}`);
};
