/**
 * @fileoverview Phase 2 End-to-End Smoke Test.
 * Validates the complete Resource CRUD lifecycle, RBAC write restrictions, multi-criteria filtering,
 * Availability Engine slot computations against active reservations, and soft-delete invariants.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS, BOOKING_STATUS, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.8: Phase 2 Resource CRUD & Availability Engine Smoke Test', () => {
  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Campus Administrator',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Engineering Student',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const adminToken = generateAccessToken(adminUser);
  const studentToken = generateAccessToken(studentUser);

  // In-memory repositories for simulated database state
  const resourceStore = new Map();
  const bookingStore = new Map();

  let createdResourceId = '';
  const testDate = '2026-09-15';

  beforeAll(() => {
    // Mock User queries for authentication middleware
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      return Promise.resolve(null);
    });

    // Mock Resource Mongoose operations backed by resourceStore
    jest.spyOn(Resource, 'create').mockImplementation(async (data) => {
      const id = new mongoose.Types.ObjectId().toString();
      const doc = {
        _id: id,
        name: data.name,
        type: data.type || RESOURCE_TYPES.CLASSROOM,
        capacity: data.capacity || 30,
        location: data.location,
        amenities: data.amenities || [],
        status: data.status || RESOURCE_STATUS.AVAILABLE,
        isActive: true,
        createdBy: {
          _id: data.createdBy,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      resourceStore.set(id, doc);
      return { _id: id };
    });

    jest.spyOn(Resource, 'findById').mockImplementation((id) => ({
      populate: jest.fn().mockImplementation(() => {
        const found = resourceStore.get(id?.toString());
        return Promise.resolve(found && found.isActive ? found : null);
      }),
    }));

    jest.spyOn(Resource, 'findOne').mockImplementation((query) => ({
      populate: jest.fn().mockImplementation(() => {
        const id = query._id?.toString();
        const found = resourceStore.get(id);
        if (found && (query.isActive === undefined || found.isActive === query.isActive)) {
          return Promise.resolve(found);
        }
        return Promise.resolve(null);
      }),
    }));

    jest.spyOn(Resource, 'find').mockImplementation((query) => ({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              let results = Array.from(resourceStore.values()).filter((r) => r.isActive);
              if (query.type) results = results.filter((r) => r.type === query.type);
              if (query.status) results = results.filter((r) => r.status === query.status);
              if (query.capacity?.$gte) results = results.filter((r) => r.capacity >= query.capacity.$gte);
              return Promise.resolve(results);
            }),
          }),
        }),
      }),
    }));

    jest.spyOn(Resource, 'countDocuments').mockImplementation((query) => {
      let results = Array.from(resourceStore.values()).filter((r) => r.isActive);
      if (query.type) results = results.filter((r) => r.type === query.type);
      if (query.status) results = results.filter((r) => r.status === query.status);
      if (query.capacity?.$gte) results = results.filter((r) => r.capacity >= query.capacity.$gte);
      return Promise.resolve(results.length);
    });

    jest.spyOn(Resource, 'findOneAndUpdate').mockImplementation((query, update) => {
      const id = query._id?.toString();
      const existing = resourceStore.get(id);
      if (!existing || (query.isActive !== undefined && existing.isActive !== query.isActive)) {
        return {
          then: (resolve) => resolve(null),
          populate: jest.fn().mockResolvedValue(null),
        };
      }

      const updated = { ...existing, ...update, updatedAt: new Date().toISOString() };
      resourceStore.set(id, updated);

      return {
        ...updated,
        then: (resolve) => resolve(updated),
        populate: jest.fn().mockResolvedValue(updated),
      };
    });

    // Mock Booking queries backed by bookingStore
    jest.spyOn(Booking, 'find').mockImplementation((query) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          const resId = query.resourceId?.toString();
          const list = Array.from(bookingStore.values()).filter(
            (b) => b.resourceId === resId && ['approved', 'pending'].includes(b.status)
          );
          return Promise.resolve(list);
        }),
      }),
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Admin Resource Creation & Write Guard Enforcement', () => {
    const labData = {
      name: 'Alan Turing Advanced Lab',
      type: RESOURCE_TYPES.LAB,
      capacity: 40,
      location: {
        building: 'Computer Science Wing',
        floor: 2,
        roomNumber: 'LAB-201',
      },
      amenities: ['Workstations', 'High-Speed Internet', 'Projector'],
      status: RESOURCE_STATUS.AVAILABLE,
    };

    test('Student receives 403 Forbidden when attempting to create a resource', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(labData);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('Admin successfully creates a resource (POST /api/v1/resources)', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(labData);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource.name).toBe(labData.name);
      expect(res.body.data.resource.type).toBe(RESOURCE_TYPES.LAB);
      expect(res.body.data.resource.capacity).toBe(40);
      expect(res.body.data.resource._id).toBeDefined();

      createdResourceId = res.body.data.resource._id;
    });

    test('Admin successfully updates resource capacity and amenities (PUT /api/v1/resources/:id)', async () => {
      const res = await request(app)
        .put(`/api/v1/resources/${createdResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 45,
          amenities: ['Workstations', 'High-Speed Internet', 'Projector', 'Smart Whiteboard'],
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource.capacity).toBe(45);
      expect(res.body.data.resource.amenities).toContain('Smart Whiteboard');
    });
  });

  describe('2. Student Read, Search, and Filtering', () => {
    test('Student lists and filters resources by category and min capacity', async () => {
      const res = await request(app)
        .get('/api/v1/resources?type=lab&minCapacity=30')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.resources)).toBe(true);
      expect(res.body.data.resources.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });

    test('Student fetches single resource details by ID (GET /api/v1/resources/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${createdResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource._id).toBe(createdResourceId);
      expect(res.body.data.resource.name).toBe('Alan Turing Advanced Lab');
    });
  });

  describe('3. Availability Engine & Conflict Prevention Calculations', () => {
    test('Calculates 100% available slots (12/12) for an empty schedule', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${createdResourceId}/availability?date=${testDate}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOperational).toBe(true);
      expect(res.body.data.totalSlots).toBe(12);
      expect(res.body.data.availableSlotsCount).toBe(12);
      expect(res.body.data.slots.every((s) => s.available)).toBe(true);
    });

    test('Accurately flags occupied slots when active booking exists', async () => {
      // Simulate active booking from 10:00 to 12:00 UTC
      const bookingId = new mongoose.Types.ObjectId().toString();
      bookingStore.set(bookingId, {
        _id: bookingId,
        resourceId: createdResourceId,
        title: 'Machine Learning Workshop',
        status: BOOKING_STATUS.APPROVED,
        startTime: '2026-09-15T10:00:00.000Z',
        endTime: '2026-09-15T12:00:00.000Z',
      });

      const res = await request(app)
        .get(`/api/v1/resources/${createdResourceId}/availability?date=${testDate}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSlots).toBe(12);
      expect(res.body.data.availableSlotsCount).toBe(10);

      // Check slot 10:00 - 11:00 UTC is busy
      const slot10 = res.body.data.slots.find((s) => s.startTime === '2026-09-15T10:00:00.000Z');
      expect(slot10.available).toBe(false);
      expect(slot10.conflict.title).toBe('Machine Learning Workshop');

      // Check slot 11:00 - 12:00 UTC is busy
      const slot11 = res.body.data.slots.find((s) => s.startTime === '2026-09-15T11:00:00.000Z');
      expect(slot11.available).toBe(false);

      // Check slot 09:00 - 10:00 UTC is free
      const slot09 = res.body.data.slots.find((s) => s.startTime === '2026-09-15T09:00:00.000Z');
      expect(slot09.available).toBe(true);
    });
  });

  describe('4. Soft-Delete & Lifecycle Invariants', () => {
    test('Student cannot delete resource (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/resources/${createdResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Admin soft-deletes resource successfully (DELETE /api/v1/resources/:id)', async () => {
      const res = await request(app)
        .delete(`/api/v1/resources/${createdResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deactivated successfully');
    });

    test('Deactivated resource is inaccessible and returns 404', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${createdResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    test('Availability query for deactivated resource returns 404', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${createdResourceId}/availability?date=${testDate}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
