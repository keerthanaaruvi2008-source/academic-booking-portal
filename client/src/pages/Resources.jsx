/**
 * @fileoverview Resources Page.
 * Displays searchable and filterable resource catalogue with availability checkers,
 * dynamic date/slot schedules, 1-click slot reservations, and admin management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchResources, deleteResource } from '../services/resourceService.js';
import ResourceCard from '../components/ResourceCard.jsx';
import AvailabilityModal from '../components/AvailabilityModal.jsx';
import AddResourceModal from '../components/AddResourceModal.jsx';
import BookingModal from '../components/BookingModal.jsx';
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Building,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/**
 * Resources catalogue page component.
 * @returns {JSX.Element}
 */
export const ResourcesPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    minCapacity: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [availabilityResource, setAvailabilityResource] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState(null);
  const [bookingModalState, setBookingModalState] = useState(null);

  const loadResources = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);
        const params = {
          page: pageToLoad,
          limit: 12,
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.minCapacity ? { minCapacity: Number(filters.minCapacity) } : {}),
        };

        const res = await fetchResources(params);
        setResources(res.data?.resources || []);
        setPagination(res.data?.pagination || { page: 1, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to fetch resources.');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadResources(1);
  }, [loadResources]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: '',
      status: '',
      minCapacity: '',
    });
  };

  const handleOpenAddModal = () => {
    setResourceToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (resource) => {
    setResourceToEdit(resource);
    setIsAddModalOpen(true);
  };

  const handleDeleteResource = async (resource) => {
    if (!window.confirm(`Are you sure you want to deactivate "${resource.name}"?`)) {
      return;
    }

    try {
      await deleteResource(resource._id);
      showSuccess(`Facility "${resource.name}" deactivated successfully.`);
      loadResources(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to deactivate resource.');
    }
  };

  const handleBookSlotFromAvailability = (slot, resource, selectedDate) => {
    setAvailabilityResource(null);
    setBookingModalState({
      resource,
      initialData: {
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        title: `${resource.name} Event`,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Campus Infrastructure</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Institutional Resources</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, filter, and inspect real-time availability across campus seminar halls, labs, and classrooms.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Facility
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or room..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
            >
              <option value="">All Categories</option>
              <option value="classroom">Classroom</option>
              <option value="seminar_hall">Seminar Hall</option>
              <option value="lab">Computer Lab</option>
              <option value="auditorium">Auditorium</option>
              <option value="equipment">Specialized Equipment</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Min Capacity */}
          <div>
            <input
              type="number"
              name="minCapacity"
              min="1"
              value={filters.minCapacity}
              onChange={handleFilterChange}
              placeholder="Min Capacity (e.g. 50)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Active Filter Chips / Reset */}
        {(filters.search || filters.type || filters.status || filters.minCapacity) && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">Filtering active results</span>
            <button
              onClick={handleClearFilters}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading campus facilities...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
          <Building className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-800">No matching resources found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Try adjusting your search query, capacity minimums, or filter criteria.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold hover:bg-primary-100 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Resource Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                isAdmin={isAdmin}
                onCheckAvailability={(res) => setAvailabilityResource(res)}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteResource}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-gray-200 text-sm">
              <span className="text-gray-500">
                Showing Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
                <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => loadResources(pagination.page - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => loadResources(pagination.page + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dynamic Availability Modal */}
      <AvailabilityModal
        resource={availabilityResource}
        isOpen={Boolean(availabilityResource)}
        onClose={() => setAvailabilityResource(null)}
        onBookSlot={handleBookSlotFromAvailability}
      />

      {/* 1-Click Booking Modal from Availability */}
      {bookingModalState && (
        <BookingModal
          isOpen={Boolean(bookingModalState)}
          preselectedResource={bookingModalState.resource}
          initialData={bookingModalState.initialData}
          onClose={() => setBookingModalState(null)}
          onSuccess={() => {
            showSuccess('Reservation request submitted successfully! Waiting for administrator approval.');
            setBookingModalState(null);
          }}
        />
      )}

      {/* Admin Add / Edit Modal */}
      {isAdmin && (
        <AddResourceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => loadResources(pagination.page)}
          resourceToEdit={resourceToEdit}
        />
      )}
    </div>
  );
};

export default ResourcesPage;
