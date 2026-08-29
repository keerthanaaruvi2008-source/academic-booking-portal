/**
 * @fileoverview AddResourceModal component.
 * Admin modal for creating or editing institutional halls, labs, and facilities.
 * Integrates directly with resourceService and Toast notifications.
 */

import React, { useState, useEffect } from 'react';
import { createResource, updateResource } from '../services/resourceService.js';
import { useToast } from '../context/ToastContext.jsx';
import { X, Loader2, AlertCircle, Building2, Layers, MapPin, Sparkles, Hash, Users } from 'lucide-react';

/**
 * Modal form for creating and modifying campus resources.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 * @param {object} [props.resourceToEdit]
 * @returns {JSX.Element|null}
 */
export const AddResourceModal = ({ isOpen, onClose, onSuccess, resourceToEdit }) => {
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: 'classroom',
    capacity: 40,
    building: '',
    floor: 1,
    roomNumber: '',
    amenities: '',
    status: 'available',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = Boolean(resourceToEdit);

  useEffect(() => {
    if (resourceToEdit) {
      setFormData({
        name: resourceToEdit.name || '',
        type: resourceToEdit.type || 'classroom',
        capacity: resourceToEdit.capacity || 40,
        building: resourceToEdit.location?.building || '',
        floor: resourceToEdit.location?.floor || 1,
        roomNumber: resourceToEdit.location?.roomNumber || '',
        amenities: resourceToEdit.amenities?.join(', ') || '',
        status: resourceToEdit.status || 'available',
      });
    } else {
      setFormData({
        name: '',
        type: 'classroom',
        capacity: 40,
        building: '',
        floor: 1,
        roomNumber: '',
        amenities: '',
        status: 'available',
      });
    }
    setError(null);
  }, [resourceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      capacity: Number(formData.capacity),
      location: {
        building: formData.building.trim(),
        floor: Number(formData.floor),
        roomNumber: formData.roomNumber.trim(),
      },
      amenities: formData.amenities
        ? formData.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      status: formData.status,
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateResource(resourceToEdit._id, payload);
        showSuccess(`Facility "${payload.name}" updated successfully.`);
      } else {
        await createResource(payload);
        showSuccess(`Facility "${payload.name}" created and added to catalog.`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const errMsg = err.message || 'Failed to save facility details.';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Campus Facility' : 'Add New Campus Facility'}
              </h2>
              <p className="text-xs text-gray-500">
                Register classrooms, auditoriums, or labs into the institutional catalog.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-name">
              Facility / Hall Name *
            </label>
            <input
              id="res-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Marie Curie Seminar Hall or Turing Lab"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-type">
                Category *
              </label>
              <select
                id="res-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="classroom">Classroom</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="lab">Computer / Science Lab</option>
                <option value="auditorium">Auditorium</option>
                <option value="equipment">Specialized Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-capacity">
                Seating Capacity *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="res-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  required
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="50"
                  className="w-full pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-building">
                Building *
              </label>
              <input
                id="res-building"
                name="building"
                type="text"
                required
                value={formData.building}
                onChange={handleChange}
                placeholder="Main Science Block"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-floor">
                Floor
              </label>
              <input
                id="res-floor"
                name="floor"
                type="number"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-room">
                Room No. *
              </label>
              <input
                id="res-room"
                name="roomNumber"
                type="text"
                required
                value={formData.roomNumber}
                onChange={handleChange}
                placeholder="HALL-101"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-amenities">
              Available Amenities (comma separated)
            </label>
            <input
              id="res-amenities"
              name="amenities"
              type="text"
              value={formData.amenities}
              onChange={handleChange}
              placeholder="Dual 4K Projector, Surround Sound, Microphones, High-End GPUs, AC"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-status">
              Operational Status
            </label>
            <select
              id="res-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="available">Available for Bookings</option>
              <option value="maintenance">Under Scheduled Maintenance</option>
              <option value="unavailable">Temporarily Unavailable</option>
            </select>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Facility'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddResourceModal;
