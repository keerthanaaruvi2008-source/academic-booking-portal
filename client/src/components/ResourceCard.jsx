/**
 * @fileoverview ResourceCard component.
 * Displays resource specifications, capacity, location, amenities, and interaction triggers.
 */

import React from 'react';
import { Users, MapPin, Calendar, Edit, Trash2, CheckCircle2, Wrench, Ban } from 'lucide-react';

/**
 * Resource card item component.
 *
 * @param {object} props
 * @param {object} props.resource - Resource data.
 * @param {boolean} props.isAdmin - Whether current user has administrator role.
 * @param {Function} props.onCheckAvailability - Callback when clicking check availability.
 * @param {Function} [props.onEdit] - Callback when clicking edit (admin only).
 * @param {Function} [props.onDelete] - Callback when clicking delete (admin only).
 * @returns {JSX.Element}
 */
export const ResourceCard = ({
  resource,
  isAdmin,
  onCheckAvailability,
  onEdit,
  onDelete,
}) => {
  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'seminar_hall':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lab':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'auditorium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'equipment':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'classroom':
      default:
        return 'bg-teal-100 text-teal-800 border-teal-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Wrench className="w-3.5 h-3.5" /> Maintenance
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban className="w-3.5 h-3.5" /> Unavailable
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
      <div className="p-6">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg border ${getTypeBadgeColor(
              resource.type
            )}`}
          >
            {resource.type?.replace('_', ' ')}
          </span>
          {getStatusBadge(resource.status)}
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{resource.name}</h3>

        {/* Capacity & Location */}
        <div className="space-y-1.5 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>Capacity: <strong className="text-gray-700">{resource.capacity}</strong> seats/units</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">
              {resource.location?.building} • Floor {resource.location?.floor} • Room {resource.location?.roomNumber}
            </span>
          </div>
        </div>

        {/* Amenities Chips */}
        {resource.amenities && resource.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
            {resource.amenities.slice(0, 4).map((amenity, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-md font-medium"
              >
                {amenity}
              </span>
            ))}
            {resource.amenities.length > 4 && (
              <span className="px-1.5 py-0.5 text-gray-400 text-[11px]">
                +{resource.amenities.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onCheckAvailability(resource)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition"
        >
          <Calendar className="w-3.5 h-3.5" />
          Check Slots
        </button>

        {isAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit?.(resource)}
              title="Edit Resource"
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(resource)}
              title="Deactivate Resource"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;
