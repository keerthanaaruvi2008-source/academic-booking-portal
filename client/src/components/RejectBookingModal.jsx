/**
 * @fileoverview RejectBookingModal component.
 * Admin dialog to collect a mandatory justification reason when rejecting a reservation.
 */

import React, { useState } from 'react';
import { rejectBooking } from '../services/bookingService.js';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Modal prompt for booking rejection.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {object} props.booking - Target booking object.
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 * @returns {JSX.Element|null}
 */
export const RejectBookingModal = ({ isOpen, booking, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Please provide a reason of at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await rejectBooking(booking._id, reason.trim());
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reject reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reject Reservation</h2>
              <p className="text-xs text-gray-500">Provide an audit reason for rejection.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="font-semibold text-gray-900">{booking.title}</div>
            <div className="mt-0.5">
              Resource: {booking.resourceId?.name} • Requested by: {booking.bookedBy?.name}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="rejection-reason">
              Reason for Rejection
            </label>
            <textarea
              id="rejection-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Facility is booked for a departmental keynote / maintenance."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectBookingModal;
