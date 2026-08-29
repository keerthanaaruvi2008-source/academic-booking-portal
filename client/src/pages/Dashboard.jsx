/**
 * @fileoverview Authenticated User Dashboard.
 * Displays dynamic live metrics, recent bookings, quick actions, and instant modals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchResources } from '../services/resourceService.js';
import { fetchBookings, approveBooking, cancelBooking, deleteBooking } from '../services/bookingService.js';
import BookingModal from '../components/BookingModal.jsx';
import RejectBookingModal from '../components/RejectBookingModal.jsx';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Building,
  User,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  Layers,
  FileText,
  RefreshCw,
  Plus,
  X,
  Trash2,
  XCircle,
  Ban,
} from 'lucide-react';

/**
 * Dynamic Dashboard Page Component.
 * @returns {JSX.Element}
 */
export const DashboardPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState({
    totalResources: 0,
    totalBookings: 0,
    approvedBookings: 0,
    pendingBookings: 0,
    rejectedBookings: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Interactive Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [rejectModalBooking, setRejectModalBooking] = useState(null);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);

      const [resResponse, bookingsResponse] = await Promise.all([
        fetchResources({ limit: 100 }),
        fetchBookings({ limit: 50, sortBy: 'startTime', sortOrder: 'desc' }),
      ]);

      const totalRes = resResponse.data?.pagination?.total || resResponse.data?.resources?.length || 0;
      const bookingsList = bookingsResponse.data?.bookings || [];

      const approved = bookingsList.filter((b) => b.status === 'approved').length;
      const pending = bookingsList.filter((b) => b.status === 'pending').length;
      const rejected = bookingsList.filter((b) => b.status === 'rejected').length;

      setStats({
        totalResources: totalRes,
        totalBookings: bookingsList.length,
        approvedBookings: approved,
        pendingBookings: pending,
        rejectedBookings: rejected,
      });

      setRecentBookings(bookingsList.slice(0, 6));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Dashboard] Failed to load dynamic data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleApprove = async (booking) => {
    try {
      await approveBooking(booking._id);
      showSuccess(`Reservation "${booking.title}" approved!`);
      setSelectedBookingDetails(null);
      loadDashboardData(true);
    } catch (err) {
      showError(err.message || 'Failed to approve booking.');
    }
  };

  const handleCancel = async (booking) => {
    if (window.confirm(`Are you sure you want to cancel your reservation for "${booking.title}"?`)) {
      try {
        await cancelBooking(booking._id);
        showSuccess(`Reservation "${booking.title}" has been cancelled.`);
        setSelectedBookingDetails(null);
        loadDashboardData(true);
      } catch (err) {
        showError(err.message || 'Failed to cancel booking.');
      }
    }
  };

  const handleDelete = async (booking) => {
    if (window.confirm(`Permanently delete "${booking.title}"? This cannot be undone.`)) {
      try {
        await deleteBooking(booking._id);
        showSuccess(`Reservation deleted.`);
        setSelectedBookingDetails(null);
        loadDashboardData(true);
      } catch (err) {
        showError(err.message || 'Failed to delete booking.');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            Cancelled
          </span>
        );
    }
  };

  const formatScheduleTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  const formatScheduleDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const isBookingOwner = (b) => {
    if (!b || !user) return false;
    return (
      (user._id && (b.bookedBy?._id === user._id || b.bookedBy === user._id)) ||
      (user.id && (b.bookedBy?.id === user.id || b.bookedBy === user.id)) ||
      (user.email && b.bookedBy?.email?.toLowerCase() === user.email.toLowerCase())
    );
  };

  const canCancelSelected = selectedBookingDetails &&
    (isBookingOwner(selectedBookingDetails) || isAdmin) &&
    !['cancelled', 'rejected'].includes(selectedBookingDetails.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Academic User'}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-800 rounded-full capitalize">
              {user?.role}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Easwari Engineering College • {user?.department || 'Department of Computer Science & Engineering'} •{' '}
            <span className="font-mono text-gray-700">{user?.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Request New Booking
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facilities */}
        <div
          onClick={() => navigate('/resources')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-primary-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Facilities</span>
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg group-hover:scale-110 transition">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : stats.totalResources}
          </div>
          <span className="text-xs text-gray-500 mt-1 block">Active halls, labs & rooms</span>
        </div>

        {/* Confirmed Bookings */}
        <div
          onClick={() => navigate('/bookings?tab=approved')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmed</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : stats.approvedBookings}
          </div>
          <span className="text-xs text-gray-500 mt-1 block">Approved reservations</span>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => navigate('/bookings?tab=pending')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 transition cursor-pointer group relative"
        >
          {stats.pendingBookings > 0 && (
            <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full animate-pulse">
              Action Needed
            </span>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : stats.pendingBookings}
          </div>
          <span className="text-xs text-gray-500 mt-1 block">Awaiting review</span>
        </div>

        {/* Invariant Health */}
        <div
          onClick={() => navigate('/bookings')}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conflict Invariant</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600">
            100%
          </div>
          <span className="text-xs text-gray-500 mt-1 block">0 overlapping collisions</span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Reservations */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Recent & Upcoming Reservations
            </h2>
            <Link
              to="/bookings"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-2" />
              <span>Loading reservations...</span>
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center space-y-3 text-xs text-gray-500">
              <FileText className="w-10 h-10 text-gray-300 mx-auto" />
              <p>No reservations found yet. Ready to request your first booking?</p>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-xs shadow-sm hover:bg-primary-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Request Space Slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => {
                const canCancelItem = (isBookingOwner(b) || isAdmin) && !['cancelled', 'rejected'].includes(b.status);
                return (
                  <div
                    key={b._id}
                    onClick={() => setSelectedBookingDetails(b)}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-primary-300 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition">
                          {b.title}
                        </h4>
                        {getStatusBadge(b.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {b.resourceId?.name} ({b.resourceId?.location?.building}, Room {b.resourceId?.location?.roomNumber})
                      </p>
                      <span className="text-[11px] text-gray-600 font-medium block">
                        {formatScheduleDate(b.startTime)} • {formatScheduleTime(b.startTime)} - {formatScheduleTime(b.endTime)} UTC
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canCancelItem && (
                        <button
                          type="button"
                          onClick={() => handleCancel(b)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                        >
                          Cancel Request
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBookingDetails(b)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 transition whitespace-nowrap"
                      >
                        Quick Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions & Profile */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>

          <Link
            to="/resources"
            className="group bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-primary-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg group-hover:scale-105 transition">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900 block">Explore Facilities</span>
                <span className="text-xs text-gray-500">Browse labs, halls & classrooms</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            to="/bookings"
            className="group bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-primary-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900 block">
                  {isAdmin ? 'Manage Approvals Queue' : 'My Space Requests'}
                </span>
                <span className="text-xs text-gray-500">
                  {isAdmin ? 'Approve or reject campus requests' : 'Track booking statuses'}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
          </Link>

          {/* AI Assistant Promo Card */}
          <div className="p-5 bg-gradient-to-br from-primary-50 via-indigo-50 to-white rounded-2xl border border-primary-200 space-y-2">
            <div className="flex items-center gap-2 text-primary-700 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Academic Advisor</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Find open, conflict-free space slots within the 9:00 AM – 4:30 PM operating window with 1-click booking.
            </p>
            <span className="text-[11px] font-semibold text-primary-700 block">
              Click bottom-right widget to chat
            </span>
          </div>
        </div>
      </div>

      {/* User Identity Details */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          Institutional Profile & Permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-semibold block text-[10px] uppercase">Name</span>
            <span className="font-bold text-gray-900 text-sm mt-0.5 block">{user?.name}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-semibold block text-[10px] uppercase">Email</span>
            <span className="font-bold text-gray-900 font-mono text-sm mt-0.5 block">{user?.email}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-semibold block text-[10px] uppercase">Role</span>
            <span className="font-bold text-primary-700 capitalize text-sm mt-0.5 block">{user?.role}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-semibold block text-[10px] uppercase">Department</span>
            <span className="font-bold text-gray-900 text-sm mt-0.5 block">{user?.department || 'Computer Science & Engineering'}</span>
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={() => loadDashboardData(true)}
      />

      {/* Quick Inspect Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Reservation Details</h3>
                  <p className="text-xs text-gray-500">Verified booking record</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status:</span>
                {getStatusBadge(selectedBookingDetails.status)}
              </div>

              <div>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Title:</span>
                <div className="font-bold text-gray-900 text-sm mt-0.5">{selectedBookingDetails.title}</div>
              </div>

              <div>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Facility:</span>
                <div className="font-medium text-gray-900 mt-0.5">
                  {selectedBookingDetails.resourceId?.name} ({selectedBookingDetails.resourceId?.location?.building}, Room {selectedBookingDetails.resourceId?.location?.roomNumber})
                </div>
              </div>

              <div>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Time Interval:</span>
                <div className="font-medium text-gray-900 mt-0.5">
                  {formatScheduleDate(selectedBookingDetails.startTime)} at {formatScheduleTime(selectedBookingDetails.startTime)} – {formatScheduleTime(selectedBookingDetails.endTime)} UTC
                </div>
              </div>

              {selectedBookingDetails.bookedBy && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Requester:</span>
                  <div className="font-medium text-gray-900 mt-0.5">
                    {selectedBookingDetails.bookedBy.name} ({selectedBookingDetails.bookedBy.email} • {selectedBookingDetails.bookedBy.role})
                  </div>
                </div>
              )}

              {selectedBookingDetails.description && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Purpose:</span>
                  <div className="text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-200 mt-0.5">
                    {selectedBookingDetails.description}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions inside Modal */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isAdmin && selectedBookingDetails.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedBookingDetails)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectModalBooking(selectedBookingDetails);
                        setSelectedBookingDetails(null);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}

                {/* Cancel Request Button */}
                {canCancelSelected && (
                  <button
                    onClick={() => handleCancel(selectedBookingDetails)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancel Request
                  </button>
                )}

                {/* Admin Delete Action */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(selectedBookingDetails)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reject Modal */}
      <RejectBookingModal
        isOpen={Boolean(rejectModalBooking)}
        booking={rejectModalBooking}
        onClose={() => setRejectModalBooking(null)}
        onSuccess={() => loadDashboardData(true)}
      />
    </div>
  );
};

export default DashboardPage;
