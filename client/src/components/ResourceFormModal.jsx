/**
 * @fileoverview ResourceFormModal component.
 * Admin modal for creating or updating institutional resources.
 */

import React, { useState, useEffect } from 'react';
import { createResource, updateResource } from '../services/resourceService.js';
import { X, Loader2, AlertCircle, Building2 } from 'lucide-react';

/**
 * Modal form for creating and modifying resources.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSuccess
 * @param {object} [props.resourceToEdit]
 * @returns {JSX.Element|null}
 */
export const ResourceFormModal = ({ isOpen, onClose, onSuccess, resourceToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'classroom',
    capacity: 30,
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
        capacity: resourceToEdit.capacity || 30,
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
        capacity: 30,
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
      } else {
        await createResource(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save resource details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <p className="text-xs text-gray-500">
                Configure capacity, location, and operational status.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-name">
              Resource Name
            </label>
            <input
              id="res-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Turing Computer Lab or Hall 101"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-type">
                Category / Type
              </label>
              <select
                id="res-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="classroom">Classroom</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="lab">Computer Lab</option>
                <option value="auditorium">Auditorium</option>
                <option value="equipment">Specialized Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-capacity">
                Capacity (Seats/Units)
              </label>
              <input
                id="res-capacity"
                name="capacity"
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-building">
                Building
              </label>
              <input
                id="res-building"
                name="building"
                type="text"
                required
                value={formData.building}
                onChange={handleChange}
                placeholder="Block A"
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
                Room No.
              </label>
              <input
                id="res-room"
                name="roomNumber"
                type="text"
                required
                value={formData.roomNumber}
                onChange={handleChange}
                placeholder="LAB-204"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="res-amenities">
              Amenities (comma separated)
            </label>
            <input
              id="res-amenities"
              name="amenities"
              type="text"
              value={formData.amenities}
              onChange={handleChange}
              placeholder="Projector, High-End GPUs, Smart Board, AC"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
            >
              <option value="available">Available</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Footer */}
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
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Resource'
              ) : (
                'Create Resource'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceFormModal;
