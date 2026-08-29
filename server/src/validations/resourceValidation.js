/**
 * @fileoverview Zod validation schemas for Resource operations.
 * Validates request bodies, URL parameters, and query string filters.
 */

import { z } from 'zod';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LIST,
  RESOURCE_STATUS,
  RESOURCE_STATUS_LIST,
} from '../config/constants.js';

/**
 * Location validation sub-schema.
 */
const locationSchema = z.object({
  building: z
    .string({ required_error: 'Building name is required' })
    .trim()
    .min(1, 'Building name cannot be empty')
    .max(100, 'Building name cannot exceed 100 characters'),
  floor: z.coerce.number().int().default(1),
  roomNumber: z
    .string({ required_error: 'Room number is required' })
    .trim()
    .min(1, 'Room number cannot be empty')
    .max(50, 'Room number cannot exceed 50 characters'),
});

/**
 * Schema for creating a new resource.
 */
export const createResourceSchema = z.object({
  name: z
    .string({ required_error: 'Resource name is required' })
    .trim()
    .min(2, 'Resource name must be at least 2 characters')
    .max(150, 'Resource name cannot exceed 150 characters'),
  type: z
    .enum(RESOURCE_TYPE_LIST, {
      errorMap: () => ({
        message: 'Invalid resource type. Must be one of: ' + RESOURCE_TYPE_LIST.join(', '),
      }),
    })
    .default(RESOURCE_TYPES.CLASSROOM),
  capacity: z.coerce
    .number({ required_error: 'Resource capacity is required' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1'),
  location: locationSchema,
  amenities: z.array(z.string().trim()).default([]),
  status: z
    .enum(RESOURCE_STATUS_LIST, {
      errorMap: () => ({
        message: 'Invalid resource status. Must be one of: ' + RESOURCE_STATUS_LIST.join(', '),
      }),
    })
    .default(RESOURCE_STATUS.AVAILABLE),
});

/**
 * Schema for updating an existing resource.
 */
export const updateResourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Resource name must be at least 2 characters')
      .max(150, 'Resource name cannot exceed 150 characters')
      .optional(),
    type: z
      .enum(RESOURCE_TYPE_LIST, {
        errorMap: () => ({
          message: 'Invalid resource type. Must be one of: ' + RESOURCE_TYPE_LIST.join(', '),
        }),
      })
      .optional(),
    capacity: z.coerce
      .number()
      .int('Capacity must be a whole number')
      .min(1, 'Capacity must be at least 1')
      .optional(),
    location: z
      .object({
        building: z.string().trim().min(1).max(100).optional(),
        floor: z.coerce.number().int().optional(),
        roomNumber: z.string().trim().min(1).max(50).optional(),
      })
      .optional(),
    amenities: z.array(z.string().trim()).optional(),
    status: z
      .enum(RESOURCE_STATUS_LIST, {
        errorMap: () => ({
          message: 'Invalid resource status. Must be one of: ' + RESOURCE_STATUS_LIST.join(', '),
        }),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update the resource',
  });

/**
 * Schema for validating resource list query parameters.
 */
export const listResourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(RESOURCE_TYPE_LIST).optional(),
  status: z.enum(RESOURCE_STATUS_LIST).optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  maxCapacity: z.coerce.number().int().min(1).optional(),
  building: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['name', 'type', 'capacity', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc', '1', '-1']).default('desc'),
});

/**
 * Schema for validating resource ID path parameter.
 */
export const resourceIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Resource ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid resource ID format. Must be a 24-character hexadecimal ObjectId'),
});

/**
 * Schema for validating availability endpoint query parameters.
 */
export const availabilityQuerySchema = z.object({
  date: z
    .string({ required_error: 'Date query parameter is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format (e.g. 2026-08-28)'),
  startHour: z.coerce.number().int().min(0).max(23).optional(),
  endHour: z.coerce.number().int().min(1).max(24).optional(),
  slotDurationMinutes: z.coerce.number().int().min(15).max(480).optional(),
});
