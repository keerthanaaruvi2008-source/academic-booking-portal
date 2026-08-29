/**
 * @fileoverview Resource API service wrappers for frontend components.
 * Interfaces with the /api/v1/resources endpoints via the centralized Axios client.
 */

import api from './api.js';

/**
 * Fetches paginated resources with optional query filters.
 *
 * @param {object} [params={}]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.type]
 * @param {string} [params.status]
 * @param {number} [params.minCapacity]
 * @param {string} [params.search]
 * @returns {Promise<{ success: boolean, data: { resources: object[], pagination: object } }>}
 */
export const fetchResources = async (params = {}) => {
  return api.get('/resources', { params });
};

/**
 * Fetches a single resource by its unique identifier.
 *
 * @param {string} id - Resource ObjectId string.
 * @returns {Promise<{ success: boolean, data: { resource: object } }>}
 */
export const fetchResourceById = async (id) => {
  return api.get(`/resources/${id}`);
};

/**
 * Fetches time-slot availability for a resource on a specific date.
 *
 * @param {string} id - Resource ObjectId string.
 * @param {string} date - Date in 'YYYY-MM-DD' format.
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export const fetchResourceAvailability = async (id, date, options = {}) => {
  return api.get(`/resources/${id}/availability`, { params: { date, ...options } });
};

/**
 * Creates a new resource (admin only).
 *
 * @param {object} resourceData
 * @returns {Promise<{ success: boolean, data: { resource: object } }>}
 */
export const createResource = async (resourceData) => {
  return api.post('/resources', resourceData);
};

/**
 * Updates an existing resource (admin only).
 *
 * @param {string} id - Resource ObjectId string.
 * @param {object} updateData
 * @returns {Promise<{ success: boolean, data: { resource: object } }>}
 */
export const updateResource = async (id, updateData) => {
  return api.put(`/resources/${id}`, updateData);
};

/**
 * Soft-deletes a resource (admin only).
 *
 * @param {string} id - Resource ObjectId string.
 * @returns {Promise<{ success: boolean, data: { message: string, id: string } }>}
 */
export const deleteResource = async (id) => {
  return api.delete(`/resources/${id}`);
};
