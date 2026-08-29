/**
 * @fileoverview Phase 3 End-to-End Smoke Test.
 * Validates the complete Conflict-Free Reservation lifecycle: creation, 409 conflict detection with suggested slots,
 * alternative slot booking, administrative approval/rejection workflows, role-scoped queries, and cancellations.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, BOOKING_STATUS, RESOURCE_STATUS, RESOURCE_TYPES, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 3.8: Phase 3 Conflict-Free Booking Engine & Queuing Smoke Test', () => {
  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Administrator',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const studentA = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student Alice',
    email: 'alice@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const studentB = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student Bob',
    email: 'bob@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const adminToken = generateAccessToken(adminUser);
  const studentAToken = generateAccessToken(studentA);
  const studentBToken = generateAccessToken(studentB);

  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockResource = {
    _id: mockResourceId,
    name: 'Ada Lovelace Seminar Hall',
    type: RESOURCE_TYPES.SEMINAR_HALL,
    capacity: 120,
    location: {
      building: 'Science Complex',
      floor: 1,
      roomNumber: 'HALL-101',
    },
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  // In-memory backing store for bookings
  const bookingStore = new Map();
  let bookingAId = '';
  let bookingBId = '';

  beforeAll(() => {
    // Mock user lookup
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      if (query._id === studentA._id) return Promise.resolve(studentA);
      if (query._id === studentB._id) return Promise.resolve(studentB);
      return Promise.resolve(null);
    });

    // Mock resource lookup
    jest.spyOn(Resource, 'findOne').mockImplementation((query) => ({
      populate: jest.fn().mockImplementation(() => {
        const id = query._id?.toString();
        if (id === mockResourceId && (query.isActive === undefined || mockResource.isActive === query.isActive)) {
          return Promise.resolve(mockResource);
        }
        return Promise.resolve(null);
      }),
    }));

    // Mock booking find with overlap support
    jest.spyOn(Booking, 'find').mockImplementation((query) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          const resId = query.resourceId?.toString();
          let list = Array.from(bookingStore.values()).filter((b) => b.resourceId._id === resId);

          if (query.status?.$in) {
            list = list.filter((b) => query.status.$in.includes(b.status));
          }

          if (query.startTime?.$lt && query.endTime?.$gt) {
            const reqEnd = new Date(query.startTime.$lt).getTime();
            const reqStart = new Date(query.endTime.$gt).getTime();
            list = list.filter((b) => {
              const bStart = new Date(b.startTime).getTime();
              const bEnd = new Date(b.endTime).getTime();
              return bStart < reqEnd && bEnd > reqStart;
            });
          }

          return Promise.resolve(list);
        }),
      }),
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockImplementation(() => {
                  let results = Array.from(bookingStore.values());
                  if (query.bookedBy) {
                    results = results.filter((b) => b.bookedBy._id === query.bookedBy.toString());
                  }
                  if (query.status) {
                    results = results.filter((b) => b.status === query.status);
                  }
                  return Promise.resolve(results);
                }),
              }),
            }),
          }),
        }),
      }),
    }));

    jest.spyOn(Booking, 'countDocuments').mockImplementation((query) => {
      let results = Array.from(bookingStore.values());
      if (query.bookedBy) {
        results = results.filter((b) => b.bookedBy._id === query.bookedBy.toString());
      }
      if (query.status) {
        results = results.filter((b) => b.status === query.status);
      }
      return Promise.resolve(results.length);
    });

    // Mock Booking create
    jest.spyOn(Booking, 'create').mockImplementation(async (docs) => {
      const docData = Array.isArray(docs) ? docs[0] : docs;
      const id = new mongoose.Types.ObjectId().toString();

      const userObj =
        docData.bookedBy === studentA._id
          ? studentA
          : docData.bookedBy === studentB._id
          ? studentB
          : adminUser;

      const savedDoc = {
        _id: id,
        resourceId: mockResource,
        bookedBy: userObj,
        approvedBy: docData.approvedBy || null,
        title: docData.title,
        description: docData.description || '',
        startTime: docData.startTime,
        endTime: docData.endTime,
        status: docData.status || BOOKING_STATUS.PENDING,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        save: jest.fn().mockImplementation(function () {
          bookingStore.set(id, this);
          return Promise.resolve(this);
        }),
      };

      bookingStore.set(id, savedDoc);
      return Array.isArray(docs) ? [savedDoc] : savedDoc;
    });

    // Mock Booking findById
    jest.spyOn(Booking, 'findById').mockImplementation((id) => {
      const found = bookingStore.get(id?.toString());
      if (!found) return Promise.resolve(null);

      return {
        ...found,
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(found),
          }),
        }),
        save: jest.fn().mockImplementation(function () {
          bookingStore.set(id.toString(), this);
          return Promise.resolve(this);
        }),
      };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Student Reservation Creation & Overlap Collision Prevention', () => {
    test('Student A creates reservation for 10:00 - 12:00 UTC (201 Created, status: pending)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Quantum Computing Seminar',
          description: 'Special guest presentation.',
          startTime: '2026-11-10T10:00:00.000Z',
          endTime: '2026-11-10T12:00:00.000Z',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking._id).toBeDefined();
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.PENDING);

      bookingAId = res.body.data.booking._id;
    });

    test('Student B submits overlapping request (11:00 - 13:00 UTC) -> 409 Conflict with suggestedSlots', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Robotics Workshop',
          startTime: '2026-11-10T11:00:00.000Z',
          endTime: '2026-11-10T13:00:00.000Z',
        });

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
      expect(res.body.error.conflictingBookingId).toBe(bookingAId);
      expect(Array.isArray(res.body.error.suggestedSlots)).toBe(true);
    });

    test('Student B reserves an alternative non-conflicting slot (12:00 - 14:00 UTC) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Robotics Workshop (Rescheduled)',
          startTime: '2026-11-10T12:00:00.000Z',
          endTime: '2026-11-10T14:00:00.000Z',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.PENDING);

      bookingBId = res.body.data.booking._id;
    });
  });

  describe('2. RBAC Approval Protection & Administrative Workflows', () => {
    test('Student receives 403 Forbidden when attempting to self-approve reservation', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingAId}/approve`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Student receives 403 Forbidden when attempting to reject reservation', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingAId}/reject`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({ rejectionReason: 'Trying to cancel via reject' });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Administrator approves Booking A (200 OK, status: approved)', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingAId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.APPROVED);
    });

    test('Administrator rejects Booking B with audit justification (200 OK, status: rejected)', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingBId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Emergency sound system maintenance scheduled during afternoon.',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.REJECTED);
      expect(res.body.data.booking.rejectionReason).toContain('Emergency sound system maintenance');
    });
  });

  describe('3. Role-Scoped Querying & Isolation', () => {
    test('Student A queries bookings and only receives their own reservation records', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0]._id).toBe(bookingAId);
    });

    test('Administrator queries bookings and receives all institutional reservations', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings).toHaveLength(2);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('4. Cancellation Lifecycle', () => {
    test('Student A successfully cancels their reservation (200 OK, status: cancelled)', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CANCELLED);
    });

    test('Rejects redundant cancellation on already cancelled booking with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
    });
  });
});
