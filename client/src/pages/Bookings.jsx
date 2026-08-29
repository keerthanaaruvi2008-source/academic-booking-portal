/**
 * @fileoverview Bookings Page.
 * Displays all bookings with role-based filtering, approval actions,
 * advance policy enforcement (12h min, 9:00 AM - 4:30 PM), student privacy, and search.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchBookings, approveBooking, cancelBooking, deleteBooking } from '../services/bookingService.js';
import BookingModal from '../components/BookingModal.jsx';
import RejectBookingModal from '../components/RejectBookingModal.jsx';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  Filter,
  Ban,
  Building,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Trash2,
  Search,
} from 'lucide-react';

/**
 * Reservations and Booking Queue page component.
 * @returns {JSX.Element}
 */
export const BookingsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [activeTab, setActiveTab] = useState(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) return urlTab;
    const cached = localStorage.getItem('bookings_active_tab');
    if (cached) return cached;
    return isAdmin ? 'all' : 'my';
  });

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setStatusFilter('');
    setSearchParams({ tab: newTab });
    localStorage.setItem('bookings_active_tab', newTab);
  };

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [rejectModalBooking, setRejectModalBooking] = useState(null);

  const loadBookings = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: pageToLoad,
          limit: 10,
          sortBy: 'startTime',
          sortOrder: 'desc',
        };

        if (activeTab === 'pending') {
          params.status = 'pending';
        } else if (activeTab === 'approved') {
          params.status = 'approved';
        } else if (activeTab === 'my') {
          params.userId = user?._id;
        } else if (statusFilter) {
          params.status = statusFilter;
        }

        const res = await fetchBookings(params);
        let list = res.data?.bookings || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          list = list.filter(
            (b) =>
              b.title?.toLowerCase().includes(q) ||
              b.resourceId?.name?.toLowerCase().includes(q) ||
              b.bookedBy?.name?.toLowerCase().includes(q) ||
              b.bookedBy?.email?.toLowerCase().includes(q)
          );
        }

        setBookings(list);
        setPagination(res.data?.pagination || { page: 1, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to load reservations.');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, statusFilter, searchQuery, user?._id]
  );

  useEffect(() => {
    loadBookings(1);
  }, [loadBookings]);

  const handleApprove = async (booking) => {
    try {
      await approveBooking(booking._id);
      showSuccess(`Reservation "${booking.title}" approved successfully!`);
      loadBookings(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to approve booking.');
    }
  };

  const handleCancel = async (booking) => {
    if (window.confirm(`Are you sure you want to cancel your request for "${booking.title}"?`)) {
      try {
        await cancelBooking(booking._id);
        showSuccess(`Reservation "${booking.title}" cancelled.`);
        loadBookings(pagination.page);
      } catch (err) {
        showError(err.message || 'Failed to cancel booking.');
      }
    }
  };

  const handleDeleteBooking = async (booking) => {
    if (window.confirm(`Permanently delete "${booking.title}"? This cannot be undone.`)) {
      try {
        await deleteBooking(booking._id);
        showSuccess(`Reservation "${booking.title}" permanently deleted.`);
        loadBookings(pagination.page);
      } catch (err) {
        showError(err.message || 'Failed to delete booking.');
      }
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Reservations & Schedule Queue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isAdmin ? 'Administrative Booking Central' : 'My Space Requests & Status'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? 'Manage facility reservations, review pending academic requests, enforce rules, and oversee campus logistical operations.'
              : 'Track the real-time review status of your space reservation requests and approved bookings.'}
          </p>
        </div>

        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Request New Booking
        </button>
      </div>

      {/* Policy Notification Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-blue-900">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">Campus Booking Policies:</span>
          <p>
            • <strong>Operational Hours:</strong> Available strictly from <strong>9:00 AM to 4:30 PM max</strong>.<br />
            • <strong>Lead Time:</strong> Minimum <strong>12-hour advance booking</strong> required for administrative preparation.
          </p>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {isAdmin ? (
              <>
                <button
                  onClick={() => handleTabChange('all')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Layers className="w-4 h-4" /> All Campus Bookings
                </button>
                <button
                  onClick={() => handleTabChange('pending')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'pending'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Pending Approvals Queue
                </button>
                <button
                  onClick={() => handleTabChange('approved')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'approved'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approved Bookings
                </button>
                <button
                  onClick={() => handleTabChange('my')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'my'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" /> My Requests
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleTabChange('my')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'my'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Layers className="w-4 h-4" /> My Space Requests
                </button>
                <button
                  onClick={() => handleTabChange('pending')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'pending'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Pending Review
                </button>
                <button
                  onClick={() => handleTabChange('approved')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'approved'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approved Requests
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Double-Booking Structurally Impossible</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, requester, room..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Status: All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading reservation records...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-lg font-bold text-gray-800">No reservation records found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'No pending reservation requests awaiting review.'
              : activeTab === 'approved'
              ? 'No approved reservations found.'
              : 'You do not have any bookings matching this filter.'}
          </p>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition"
          >
            Request a Slot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bookings.map((booking) => {
            const isOwner =
              (user?._id && (booking.bookedBy?._id === user._id || booking.bookedBy === user._id)) ||
              (user?.id && (booking.bookedBy?.id === user.id || booking.bookedBy === user.id)) ||
              (user?.email && booking.bookedBy?.email?.toLowerCase() === user.email?.toLowerCase());
            const canCancel = (isOwner || isAdmin) && !['cancelled', 'rejected'].includes(booking.status);

            return (
              <div
                key={booking._id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md bg-gray-100 text-gray-700">
                      {booking.resourceId?.type?.replace('_', ' ')}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-gray-900">{booking.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.resourceId?.name} ({booking.resourceId?.location?.building}, Room {booking.resourceId?.location?.roomNumber})
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{formatDateTime(booking.startTime)} – {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</span>
                    </div>

                    {booking.bookedBy && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>
                          Requested by: <strong className="text-gray-800">{booking.bookedBy.name}</strong> ({booking.bookedBy.email} • {booking.bookedBy.role})
                        </span>
                      </div>
                    )}
                  </div>

                  {booking.description && (
                    <div className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      {booking.description}
                    </div>
                  )}

                  {booking.status === 'rejected' && booking.rejectionReason && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
                      <strong>Rejection Reason:</strong> {booking.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  {isAdmin && booking.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(booking)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModalBooking(booking)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => handleCancel(booking)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                    >
                      Cancel Request
                    </button>
                  )}

                  {/* Admin Delete Action */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteBooking(booking)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-auto"
                      title="Permanently Delete Booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-gray-200 text-sm">
          <span className="text-gray-500">
            Showing Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
            <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.hasPrevPage}
              onClick={() => loadBookings(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              disabled={!pagination.hasNextPage}
              onClick={() => loadBookings(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={() => loadBookings(pagination.page)}
      />

      {/* Admin Reject Modal */}
      <RejectBookingModal
        isOpen={Boolean(rejectModalBooking)}
        booking={rejectModalBooking}
        onClose={() => setRejectModalBooking(null)}
        onSuccess={() => loadBookings(pagination.page)}
      />
    </div>
  );
};

export default BookingsPage;
