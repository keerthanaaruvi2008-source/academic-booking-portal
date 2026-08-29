/**
 * @fileoverview Resource controller handling HTTP requests for institutional resource management.
 */

import { HTTP_STATUS } from '../config/constants.js';
import * as resourceService from '../services/resourceService.js';
import { getAvailableSlots } from '../services/availabilityEngine.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Creates a new resource (admin only).
 * @route POST /api/v1/resources
 */
export const create = asyncHandler(async (req, res) => {
  const resource = await resourceService.createResource(req.body, req.user._id);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: {
      resource,
    },
  });
});

/**
 * Retrieves a single resource by ID.
 * @route GET /api/v1/resources/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const resource = await resourceService.getResourceById(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      resource,
    },
  });
});

/**
 * Lists resources with filtering, search, and pagination.
 * @route GET /api/v1/resources
 */
export const list = asyncHandler(async (req, res) => {
  const result = await resourceService.listResources(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});

/**
 * Updates an existing resource (admin only).
 * @route PUT /api/v1/resources/:id
 */
export const update = asyncHandler(async (req, res) => {
  const resource = await resourceService.updateResource(req.params.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      resource,
    },
  });
});

/**
 * Soft-deletes a resource (admin only).
 * @route DELETE /api/v1/resources/:id
 */
export const remove = asyncHandler(async (req, res) => {
  const result = await resourceService.deleteResource(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});

/**
 * Retrieves availability time slots for a resource on a specific date.
 * @route GET /api/v1/resources/:id/availability?date=YYYY-MM-DD
 */
export const getAvailability = asyncHandler(async (req, res) => {
  const result = await getAvailableSlots(req.params.id, req.query.date, req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});
