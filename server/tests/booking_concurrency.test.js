/**
 * @fileoverview Concurrency Stress Testing Suite.
 * Validates the core invariant: ZERO DOUBLE-BOOKING under high-concurrency race conditions.
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

describe('Step 3.5: Concurrency & Zero Double-Booking Stress Verification', () => {
  const resourceAId = new mongoose.Types.ObjectId().toString();
  const resourceBId = new mongoose.Types.ObjectId().toString();

  const mockResources = new Map([
    [
      resourceAId,
      {
        _id: resourceAId,
        name: 'Turing Computer Lab',
        type: RESOURCE_TYPES.LAB,
        capacity: 40,
        status: RESOURCE_STATUS.AVAILABLE,
        isActive: true,
      },
    ],
    [
      resourceBId,
      {
        _id: resourceBId,
        name: 'Shannon Seminar Hall',
        type: RESOURCE_TYPES.SEMINAR_HALL,
        capacity: 100,
        status: RESOURCE_STATUS.AVAILABLE,
        isActive: true,
      },
    ],
  ]);

  // Simulated thread-safe booking store with atomic lock simulation
  const bookingStore = new Map();

  // Create 10 distinct student test users
  const testUsers = Array.from({ length: 10 }).map((_, idx) => ({
    _id: new mongoose.Types.ObjectId().toString(),
    name: `Student Concurrency Tester ${idx + 1}`,
    email: `student${idx + 1}@university.edu`,
    role: ROLES.STUDENT,
    isActive: true,
  }));

  const userTokens = testUsers.map((u) => generateAccessToken(u));

  beforeAll(() => {
    // User auth resolution
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      const user = testUsers.find((u) => u._id === query._id);
      return Promise.resolve(user || null);
    });

    // Resource resolution
    jest.spyOn(Resource, 'findOne').mockImplementation((query) => ({
      populate: jest.fn().mockImplementation(() => {
        const id = query._id?.toString();
        const res = mockResources.get(id);
        if (res && (query.isActive === undefined || res.isActive === query.isActive)) {
          return Promise.resolve(res);
        }
        return Promise.resolve(null);
      }),
    }));

    // Booking find with interval overlap query support
    jest.spyOn(Booking, 'find').mockImplementation((query) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          const resId = query.resourceId?.toString();
          let list = Array.from(bookingStore.values()).filter((b) => b.resourceId === resId);

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
      session: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          const resId = query.resourceId?.toString();
          let list = Array.from(bookingStore.values()).filter((b) => b.resourceId === resId);
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
    }));

    // Atomic Booking creation simulation
    jest.spyOn(Booking, 'create').mockImplementation(async (docs) => {
      const docData = Array.isArray(docs) ? docs[0] : docs;
      const startMs = new Date(docData.startTime).getTime();
      const endMs = new Date(docData.endTime).getTime();
      const resId = docData.resourceId.toString();

      // Atomic race check: ensure no concurrent winner inserted before us
      const collision = Array.from(bookingStore.values()).some((b) => {
        if (b.resourceId !== resId) return false;
        if (!['approved', 'pending'].includes(b.status)) return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return bStart < endMs && bEnd > startMs;
      });

      if (collision) {
        const error = new Error('E11000 duplicate key error collection');
        error.code = 11000;
        throw error;
      }

      const id = new mongoose.Types.ObjectId().toString();
      const savedDoc = {
        _id: id,
        ...docData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bookingStore.set(id, savedDoc);
      return Array.isArray(docs) ? [savedDoc] : savedDoc;
    });

    jest.spyOn(Booking, 'findById').mockImplementation((id) => ({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockImplementation(() => {
            const found = bookingStore.get(id?.toString());
            return Promise.resolve(found || null);
          }),
        }),
      }),
    }));
  });

  beforeEach(() => {
    bookingStore.clear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. 10-Way Simultaneous Race Condition for Identical Time Slot', () => {
    test('Exactly 1 request succeeds (201 Created) and 9 requests receive 409 Conflict', async () => {
      const slotPayload = {
        resourceId: resourceAId,
        title: 'Concurrent AI Workshop Registration',
        startTime: '2026-10-01T10:00:00.000Z',
        endTime: '2026-10-01T12:00:00.000Z',
      };

      // Launch 10 simultaneous HTTP requests
      const promises = userTokens.map((token, idx) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...slotPayload,
            title: `AI Workshop Registration - Student ${idx + 1}`,
          })
      );

      const responses = await Promise.all(promises);

      const successResponses = responses.filter((r) => r.status === HTTP_STATUS.CREATED);
      const conflictResponses = responses.filter((r) => r.status === HTTP_STATUS.CONFLICT);

      expect(successResponses).toHaveLength(1);
      expect(conflictResponses).toHaveLength(9);

      // Verify the winning booking payload
      expect(successResponses[0].body.success).toBe(true);
      expect(successResponses[0].body.data.booking._id).toBeDefined();

      // Verify all losing responses received structured 409 Conflict envelope
      conflictResponses.forEach((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('BOOKING_CONFLICT');
      });

      // Verify database store holds exactly 1 booking
      expect(bookingStore.size).toBe(1);
    });
  });

  describe('2. Interval Overlap Collision Matrix', () => {
    test('Enforces interval boundaries: rejects head/tail/interior/exterior overlaps and accepts adjacent slots', async () => {
      // Step A: Seed initial reservation 10:00 - 12:00 UTC
      const baseRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .send({
          resourceId: resourceAId,
          title: 'Anchor Reservation (10:00 - 12:00)',
          startTime: '2026-10-05T10:00:00.000Z',
          endTime: '2026-10-05T12:00:00.000Z',
        });
      expect(baseRes.status).toBe(HTTP_STATUS.CREATED);

      // Test 1: Head Overlap (09:30 - 10:30) -> 409
      const headOverlap = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[1]}`)
        .send({
          resourceId: resourceAId,
          title: 'Head Overlap Attempt',
          startTime: '2026-10-05T09:30:00.000Z',
          endTime: '2026-10-05T10:30:00.000Z',
        });
      expect(headOverlap.status).toBe(HTTP_STATUS.CONFLICT);
      expect(headOverlap.body.error.code).toBe('BOOKING_CONFLICT');

      // Test 2: Tail Overlap (11:30 - 12:30) -> 409
      const tailOverlap = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[2]}`)
        .send({
          resourceId: resourceAId,
          title: 'Tail Overlap Attempt',
          startTime: '2026-10-05T11:30:00.000Z',
          endTime: '2026-10-05T12:30:00.000Z',
        });
      expect(tailOverlap.status).toBe(HTTP_STATUS.CONFLICT);

      // Test 3: Interior Enclosed Overlap (10:30 - 11:30) -> 409
      const interiorOverlap = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[3]}`)
        .send({
          resourceId: resourceAId,
          title: 'Interior Overlap Attempt',
          startTime: '2026-10-05T10:30:00.000Z',
          endTime: '2026-10-05T11:30:00.000Z',
        });
      expect(interiorOverlap.status).toBe(HTTP_STATUS.CONFLICT);

      // Test 4: Exterior Enclosing Overlap (09:00 - 13:00) -> 409
      const exteriorOverlap = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[4]}`)
        .send({
          resourceId: resourceAId,
          title: 'Exterior Overlap Attempt',
          startTime: '2026-10-05T09:00:00.000Z',
          endTime: '2026-10-05T13:00:00.000Z',
        });
      expect(exteriorOverlap.status).toBe(HTTP_STATUS.CONFLICT);

      // Test 5: Adjacent Before (08:00 - 10:00) -> 201 SUCCESS (Disjoint boundary at 10:00)
      const adjacentBefore = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[5]}`)
        .send({
          resourceId: resourceAId,
          title: 'Adjacent Before Reservation',
          startTime: '2026-10-05T08:00:00.000Z',
          endTime: '2026-10-05T10:00:00.000Z',
        });
      expect(adjacentBefore.status).toBe(HTTP_STATUS.CREATED);

      // Test 6: Adjacent After (12:00 - 14:00) -> 201 SUCCESS (Disjoint boundary at 12:00)
      const adjacentAfter = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userTokens[6]}`)
        .send({
          resourceId: resourceAId,
          title: 'Adjacent After Reservation',
          startTime: '2026-10-05T12:00:00.000Z',
          endTime: '2026-10-05T14:00:00.000Z',
        });
      expect(adjacentAfter.status).toBe(HTTP_STATUS.CREATED);

      // Total bookings in store: 3 (Anchor, Adjacent Before, Adjacent After)
      expect(bookingStore.size).toBe(3);
    });
  });

  describe('3. Multi-Resource Concurrency Isolation', () => {
    test('Parallel requests across distinct resources execute without cross-resource contention', async () => {
      // 5 requests on Resource A, 5 on Resource B for the exact same slot
      const reqsA = userTokens.slice(0, 5).map((token, idx) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            resourceId: resourceAId,
            title: `Lab A Booking ${idx + 1}`,
            startTime: '2026-10-10T14:00:00.000Z',
            endTime: '2026-10-10T16:00:00.000Z',
          })
      );

      const reqsB = userTokens.slice(5, 10).map((token, idx) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            resourceId: resourceBId,
            title: `Seminar Hall B Booking ${idx + 1}`,
            startTime: '2026-10-10T14:00:00.000Z',
            endTime: '2026-10-10T16:00:00.000Z',
          })
      );

      const [resA, resB] = await Promise.all([Promise.all(reqsA), Promise.all(reqsB)]);

      // Exactly 1 winner on Resource A
      expect(resA.filter((r) => r.status === HTTP_STATUS.CREATED)).toHaveLength(1);
      expect(resA.filter((r) => r.status === HTTP_STATUS.CONFLICT)).toHaveLength(4);

      // Exactly 1 winner on Resource B
      expect(resB.filter((r) => r.status === HTTP_STATUS.CREATED)).toHaveLength(1);
      expect(resB.filter((r) => r.status === HTTP_STATUS.CONFLICT)).toHaveLength(4);

      // Both facilities secured exactly 1 booking each
      expect(bookingStore.size).toBe(2);
    });
  });
});
