/**
 * @fileoverview AvailabilityModal component.
 * Displays dynamic, interactive date-based time slots for an institutional resource
 * with quick date navigation, slot duration switching, slot status filtering, and 1-click booking integration.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchResourceAvailability } from '../services/resourceService.js';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

/**
 * Modal to inspect time slot availability for a selected resource and date.
 *
 * @param {object} props
 * @param {object} props.resource - Selected resource object.
 * @param {boolean} props.isOpen - Whether modal is displayed.
 * @param {Function} props.onClose - Modal dismissal handler.
 * @param {Function} [props.onBookSlot] - Handler when user clicks an open slot to book.
 * @returns {JSX.Element|null}
 */
export const AvailabilityModal = ({ resource, isOpen, onClose, onBookSlot }) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotFilter, setSlotFilter] = useState('all'); // 'all', 'available', 'busy'
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAvailability = useCallback(async () => {
    if (!resource?._id || !selectedDate) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetchResourceAvailability(resource._id, selectedDate, {
        slotDurationMinutes: slotDuration,
      });
      setAvailability(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch resource availability.');
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }, [resource?._id, selectedDate, slotDuration]);

  useEffect(() => {
    if (isOpen && resource) {
      loadAvailability();
    }
  }, [isOpen, resource, loadAvailability]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(todayStr);
      setSlotDuration(60);
      setSlotFilter('all');
    }
  }, [isOpen, todayStr]);

  if (!isOpen || !resource) return null;

  const formatSlotTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    if (newDateStr >= todayStr) {
      setSelectedDate(newDateStr);
    }
  };

  const quickDates = [
    { label: 'Today', offset: 0 },
    { label: 'Tomorrow', offset: 1 },
    { label: '+2 Days', offset: 2 },
    { label: '+3 Days', offset: 3 },
  ].map(({ label, offset }) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      label,
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString([], { weekday: 'short' }),
    };
  });

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00Z').toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const filteredSlots = (availability?.slots || []).filter((slot) => {
    if (slotFilter === 'available') return slot.available;
    if (slotFilter === 'busy') return !slot.available;
    return true;
  });

  const percentFree = availability?.totalSlots
    ? Math.round((availability.availableSlotsCount / availability.totalSlots) * 100)
    : 0;

  const handleSlotClick = (slot) => {
    if (!slot.available) return;
    if (onBookSlot) {
      onBookSlot(slot, resource, selectedDate);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-gray-50 via-white to-primary-50/20">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">
              <span className="px-2 py-0.5 bg-primary-100/80 rounded-md">{resource.type?.replace('_', ' ')}</span>
              <span>•</span>
              <span>Capacity: {resource.capacity} seats</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{resource.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {resource.location?.building} • Floor {resource.location?.floor} • Room {resource.location?.roomNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Controls & Schedules */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Dynamic Date Navigation Bar */}
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftDate(-1)}
                  disabled={selectedDate <= todayStr}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-xs">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{formattedSelectedDate}</span>
                </div>

                <button
                  onClick={() => shiftDate(1)}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
              </div>

              <button
                onClick={loadAvailability}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition self-end sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-primary-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Live Refresh</span>
              </button>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60 overflow-x-auto">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Quick Jump:
              </span>
              {quickDates.map((q) => (
                <button
                  key={q.dateStr}
                  onClick={() => setSelectedDate(q.dateStr)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    selectedDate === q.dateStr
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {q.label} ({q.dayName})
                </button>
              ))}
            </div>
          </div>

          {/* Granularity & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-semibold text-gray-700">Slot Increment:</span>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                {[
                  { label: '30m', val: 30 },
                  { label: '60m (1h)', val: 60 },
                  { label: '120m (2h)', val: 120 },
                ].map((dur) => (
                  <button
                    key={dur.val}
                    onClick={() => setSlotDuration(dur.val)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      slotDuration === dur.val
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSlotFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  slotFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({availability?.totalSlots || 0})
              </button>
              <button
                onClick={() => setSlotFilter('available')}
                className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  slotFilter === 'available'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Open ({availability?.availableSlotsCount || 0})
              </button>
              <button
                onClick={() => setSlotFilter('busy')}
                className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  slotFilter === 'busy'
                    ? 'bg-white text-rose-800 shadow-xs'
                    : 'text-gray-600 hover:text-rose-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Busy ({(availability?.totalSlots || 0) - (availability?.availableSlotsCount || 0)})
              </button>
            </div>
          </div>

          {/* Invariant Assurance Box */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Real-time schedule derived from atomic DB locks. Overlapping reservations are blocked.
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Calculating real-time slot availability...</p>
            </div>
          )}

          {/* Availability Breakdown */}
          {!loading && availability && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-gray-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span>Operating Hours: {availability.operatingHours?.start} – {availability.operatingHours?.end} UTC</span>
                  </div>
                  <span className="text-primary-700 font-extrabold">
                    {availability.availableSlotsCount} of {availability.totalSlots} Slots Free ({percentFree}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${percentFree}%` }}
                    title={`${percentFree}% Available`}
                  ></div>
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${100 - percentFree}%` }}
                    title={`${100 - percentFree}% Reserved`}
                  ></div>
                </div>
              </div>

              {!availability.isOperational ? (
                <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                  <Ban className="w-10 h-10 text-amber-600 mx-auto" />
                  <h4 className="font-bold text-amber-900 text-base">Facility Unavailable</h4>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">{availability.message}</p>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center text-gray-500 text-xs">
                  No slots found matching the <strong>{slotFilter}</strong> filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredSlots.map((slot, index) => {
                    const isOpenSlot = slot.available;
                    const isLessThan12h = isOpenSlot && (new Date(slot.startTime).getTime() - Date.now() < 12 * 60 * 60 * 1000);
                    const canBook = isOpenSlot && !isLessThan12h;

                    return (
                      <div
                        key={index}
                        onClick={() => canBook && handleSlotClick(slot)}
                        className={`group relative p-3.5 rounded-2xl border text-sm transition-all duration-200 flex items-center justify-between select-none ${
                          canBook
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md cursor-pointer'
                            : isLessThan12h
                            ? 'bg-amber-50/50 border-amber-200 text-amber-900 opacity-90 cursor-not-allowed'
                            : 'bg-gray-100/80 border-gray-200 text-gray-400 opacity-80 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)} UTC</span>
                          </div>

                          <div className="text-[11px]">
                            {canBook ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Available to Reserve
                              </span>
                            ) : isLessThan12h ? (
                              <span className="text-amber-700 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Requires 12h advance notice
                              </span>
                            ) : (
                              <span className="text-gray-500 font-medium">
                                Reserved ({slot.conflict?.title || 'Active Booking'})
                              </span>
                            )}
                          </div>
                        </div>

                        {canBook ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg bg-emerald-600 text-white shadow-xs group-hover:hidden">
                              Open
                            </span>
                            <span className="hidden group-hover:inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg bg-primary-600 text-white shadow-sm transition">
                              <span>Book Slot</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        ) : isLessThan12h ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                            &lt; 12h Notice
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-gray-200 text-gray-600">
                            Busy
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 italic hidden sm:inline">
            💡 Click any open green slot to book immediately.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-sm font-semibold transition ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;
