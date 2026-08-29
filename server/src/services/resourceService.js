/**
 * @fileoverview Resource domain service.
 * Handles CRUD operations, multi-criteria filtering, search, pagination, and soft-delete for institutional resources.
 */

import mongoose from 'mongoose';
import Resource from '../models/Resource.js';
import { PAGINATION, HTTP_STATUS } from '../config/constants.js';
import AppError from '../utils/appError.js';
import { memStore } from '../utils/inMemoryStore.js';

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Creates a new institutional resource.
 *
 * @param {object} resourceData - Resource specifications.
 * @param {string|mongoose.Types.ObjectId} creatorId - ID of user creating the resource.
 * @returns {Promise<import('../models/Resource.js').default>} Created resource document.
 */
export const createResource = async (resourceData, creatorId) => {
  if (!creatorId) {
    throw new AppError('Creator ID is required to create a resource.', HTTP_STATUS.BAD_REQUEST, 'CREATOR_REQUIRED');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    return memStore.addResource(resourceData, creatorId);
  }

  const resource = await Resource.create({
    ...resourceData,
    createdBy: creatorId,
  });

  return Resource.findById(resource._id).populate('createdBy', 'name email role');
};

/**
 * Retrieves an active resource by its unique identifier.
 *
 * @param {string} resourceId - Resource ObjectId string.
 * @returns {Promise<import('../models/Resource.js').default>}
 * @throws {AppError} 404 if resource does not exist or is soft-deleted.
 */
export const getResourceById = async (resourceId) => {
  if (!isValidObjectId(resourceId)) {
    if (process.env.NODE_ENV !== 'test') {
      const memRes = memStore.getResourceById(resourceId);
      if (memRes) return memRes;
    }
    throw new AppError('Invalid resource identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const resource = memStore.getResourceById(resourceId);
    if (!resource) {
      throw new AppError('Resource not found or has been deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
    return resource;
  }

  const query = Resource.findOne({
    _id: resourceId,
    isActive: true,
  });

  let resource;
  if (typeof query?.populate === 'function') {
    resource = await query.populate('createdBy', 'name email role');
  } else {
    resource = await query;
  }

  if (!resource && process.env.NODE_ENV !== 'test') {
    resource = memStore.getResourceById(resourceId);
  }

  if (!resource) {
    throw new AppError('Resource not found or has been deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }

  return resource;
};

/**
 * Lists resources with pagination, multi-criteria filtering, and keyword search.
 *
 * @param {object} [params={}]
 * @param {number|string} [params.page] - Page number (default: 1).
 * @param {number|string} [params.limit] - Page size limit (default: 20, max: 100).
 * @param {string} [params.type] - Resource category filter.
 * @param {string} [params.status] - Operational status filter.
 * @param {number|string} [params.minCapacity] - Minimum capacity filter.
 * @param {number|string} [params.maxCapacity] - Maximum capacity filter.
 * @param {string} [params.building] - Building location filter.
 * @param {string} [params.search] - Case-insensitive search on name or room number.
 * @param {string} [params.sortBy='createdAt'] - Field to sort by.
 * @param {string|number} [params.sortOrder='desc'] - Sort direction ('asc'|'desc'|1|-1).
 * @returns {Promise<{ resources: object[], pagination: object }>}
 */
export const listResources = async (params = {}) => {
  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    let list = [...memStore.getResources()];
    if (params.type) list = list.filter((r) => r.type === params.type);
    if (params.minCapacity) list = list.filter((r) => r.capacity >= parseInt(params.minCapacity, 10));
    return {
      resources: list,
      pagination: {
        total: list.length,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
  const page = Math.max(1, parseInt(params.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(params.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  // Base query: Only active (non-soft-deleted) resources
  const query = { isActive: true };

  if (params.type) {
    query.type = params.type;
  }

  if (params.status) {
    query.status = params.status;
  }

  if (params.minCapacity || params.maxCapacity) {
    query.capacity = {};
    if (params.minCapacity) {
      query.capacity.$gte = parseInt(params.minCapacity, 10);
    }
    if (params.maxCapacity) {
      query.capacity.$lte = parseInt(params.maxCapacity, 10);
    }
  }

  if (params.building) {
    query['location.building'] = new RegExp(params.building.trim(), 'i');
  }

  if (params.search && params.search.trim()) {
    const searchRegex = new RegExp(params.search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { 'location.roomNumber': searchRegex },
      { 'location.building': searchRegex },
    ];
  }

  // Determine sort direction
  const sortBy = params.sortBy || 'createdAt';
  const sortDirection = params.sortOrder === 'asc' || params.sortOrder === 1 ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  const [total, resources] = await Promise.all([
    Resource.countDocuments(query),
    Resource.find(query)
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
  ]);

  if (total === 0 && memStore.getResources().length > 0 && process.env.NODE_ENV !== 'test') {
    let list = [...memStore.getResources()];
    if (params.type) list = list.filter((r) => r.type === params.type);
    if (params.minCapacity) list = list.filter((r) => r.capacity >= parseInt(params.minCapacity, 10));
    return {
      resources: list,
      pagination: {
        total: list.length,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    resources,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Updates an active resource.
 *
 * @param {string} resourceId - Resource ObjectId string.
 * @param {object} updateData - Updated field values.
 * @returns {Promise<import('../models/Resource.js').default>}
 * @throws {AppError} 404 if resource does not exist or is soft-deleted.
 */
export const updateResource = async (resourceId, updateData) => {
  if (!isValidObjectId(resourceId)) {
    throw new AppError('Invalid resource identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const resource = memStore.updateResource(resourceId, updateData);
    if (!resource) {
      throw new AppError('Resource not found or has been deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
    return resource;
  }

  // Prevent overriding immutable fields
  const sanitizedUpdate = { ...updateData };
  delete sanitizedUpdate._id;
  delete sanitizedUpdate.createdBy;
  delete sanitizedUpdate.createdAt;
  delete sanitizedUpdate.updatedAt;

  const resource = await Resource.findOneAndUpdate(
    { _id: resourceId, isActive: true },
    sanitizedUpdate,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email role');

  if (!resource) {
    throw new AppError('Resource not found or has been deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }

  return resource;
};

/**
 * Soft-deletes a resource by setting isActive to false.
 *
 * @param {string} resourceId - Resource ObjectId string.
 * @returns {Promise<{ message: string, id: string }>}
 * @throws {AppError} 404 if resource does not exist or is already deactivated.
 */
export const deleteResource = async (resourceId) => {
  if (!isValidObjectId(resourceId)) {
    throw new AppError('Invalid resource identifier format.', HTTP_STATUS.BAD_REQUEST, 'INVALID_ID_FORMAT');
  }

  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 1) {
    const deleted = memStore.deleteResource(resourceId);
    if (!deleted) {
      throw new AppError('Resource not found or already deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
    return {
      message: 'Resource deactivated successfully.',
      id: resourceId,
    };
  }

  const resource = await Resource.findOneAndUpdate(
    { _id: resourceId, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!resource) {
    throw new AppError('Resource not found or already deactivated.', HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }

  return {
    message: 'Resource deactivated successfully.',
    id: resourceId,
  };
};
