/**
 * @fileoverview BookingModal component.
 * Reservation creation dialog featuring date/time interval configuration,
 * atomic double-booking protection, 12-hour lead time validation, 9:00 AM - 4:30 PM operating window,
 * dynamic facility loading, and 409 Conflict alternative slot recommendations.
 */

import React, { useState, useEffect } from 'react';
import { createBooking } from '../services/bookingService.js';
import { fetchResources } from '../services/resourceService.js';
import {
  X,
  Calendar,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building,
  Info,
} from 'lucide-react';

/**
 * Modal form for requesting a new resource booking.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 * @param {object} [props.preselectedResource] - Optional pre-selected resource.
 * @param {object} [props.initialData] - Optional prefilled form fields.
 * @returns {JSX.Element|null}
 */
export const BookingModal = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedResource,
  initialData,
}) => {
  // Default to tomorrow (meeting 12-hour advance policy)
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(tomorrowStr);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('11:00');

  const [loadingResources, setLoadingResources] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [conflictData, setConflictData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConflictData(null);

      // Handle prefill values if provided
      if (initialData) {
        if (initialData.title) setTitle(initialData.title);
        if (initialData.description) setDescription(initialData.description);
        if (initialData.date) setDate(initialData.date);
        if (initialData.startTime) {
          const s = new Date(initialData.startTime);
          const pad = (n) => String(n).padStart(2, '0');
          setStartHour(`${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`);
        }
        if (initialData.endTime) {
          const e = new Date(initialData.endTime);
          const pad = (n) => String(n).padStart(2, '0');
          setEndHour(`${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`);
        }
      }

      if (preselectedResource) {
        setSelectedResourceId(preselectedResource._id);
      } else {
        setLoadingResources(true);
        fetchResources({ limit: 50, status: 'available' })
          .then((res) => {
            const list = res.data?.resources || [];
            setResources(list);
            if (list.length > 0) {
              if (initialData?.resourceId && list.some((r) => r._id === initialData.resourceId)) {
                setSelectedResourceId(initialData.resourceId);
              } else {
                setSelectedResourceId((prev) => (prev && list.some((r) => r._id === prev) ? prev : list[0]._id));
              }
            }
          })
          .catch((err) => {
            console.error('Failed to load resources for booking modal:', err);
          })
          .finally(() => {
            setLoadingResources(false);
          });
      }
    }
  }, [isOpen, preselectedResource, initialData, tomorrowStr]);

  if (!isOpen) return null;

  const handleApplySuggestedSlot = (slot) => {
    const startD = new Date(slot.startTime);
    const endD = new Date(slot.endTime);

    const pad = (n) => String(n).padStart(2, '0');
    const startH = `${pad(startD.getUTCHours())}:${pad(startD.getUTCMinutes())}`;
    const endH = `${pad(endD.getUTCHours())}:${pad(endD.getUTCMinutes())}`;

    setStartHour(startH);
    setEndHour(endH);
    setDate(slot.startTime.split('T')[0]);
    setError(null);
    setConflictData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setConflictData(null);

    const targetResourceId = preselectedResource?._id || selectedResourceId;
    if (!targetResourceId) {
      setError('Please select a resource facility.');
      return;
    }

    // Validate 9:00 AM to 4:30 PM operational window
    const [sH, sM] = startHour.split(':').map(Number);
    const [eH, eM] = endHour.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    if (startMins < 9 * 60 || endMins > 16 * 60 + 30) {
      setError('Slot timing must be between 9:00 AM and 4:30 PM max.');
      return;
    }

    const startISO = new Date(`${date}T${startHour}:00.000Z`).toISOString();
    const endISO = new Date(`${date}T${endHour}:00.000Z`).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      setError('End time must be strictly after start time.');
      return;
    }

    // 12-Hour Advance Notice Rule
    const startMs = new Date(startISO).getTime();
    const minNoticeMs = 12 * 60 * 60 * 1000;
    if (startMs - Date.now() < minNoticeMs) {
      setError('Bookings must be requested at least 12 hours in advance.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createBooking({
        resourceId: targetResourceId,
        title: title.trim(),
        description: description.trim(),
        startTime: startISO,
        endTime: endISO,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit reservation.');
      if (err.code === 'BOOKING_CONFLICT' || err.suggestedSlots) {
        setConflictData({
          message: err.message,
          suggestedSlots: err.suggestedSlots || [],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSlotTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Request Facility Reservation</h2>
              <p className="text-xs text-gray-500">
                Operating Hours: 9:00 AM to 4:30 PM max
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 12-Hour Lead Time & 9:00 - 16:30 Policy Alert */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Policy:</strong> Slot timings must be between <strong>9:00 AM and 4:30 PM max</strong> and booked at least <strong>12 hours in advance</strong>.
            </span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Conflict & AI Recommendations Card */}
          {conflictData && conflictData.suggestedSlots?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Conflict Detected – Suggested Open Alternative Slots:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {conflictData.suggestedSlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleApplySuggestedSlot(slot)}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg shadow-2xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)} UTC
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resource Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Facility / Resource
            </label>
            {preselectedResource ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Building className="w-4 h-4 text-primary-600" />
                <span>{preselectedResource.name}</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({preselectedResource.location?.building} • Room {preselectedResource.location?.roomNumber})
                </span>
              </div>
            ) : (
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                disabled={loadingResources}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {loadingResources ? (
                  <option value="">Loading facilities...</option>
                ) : (
                  resources.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.location?.building}, Room {r.location?.roomNumber} • Cap: {r.capacity})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Guest Lecture / Robotics Sprint"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date (Min 12h ahead)
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Time (09:00 – 16:30)
              </label>
              <input
                type="time"
                required
                min="09:00"
                max="16:30"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                End Time (09:00 – 16:30)
              </label>
              <input
                type="time"
                required
                min="09:00"
                max="16:30"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Event Details / Equipment Needed
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide event purpose, expected attendance, or specific setup requirements..."
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero double-booking guarantee</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Reservation Request'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
