/**
 * @fileoverview Step 5.8: Grand Full-Stack End-to-End System Smoke Test.
 * Validates the complete portal lifecycle across all 5 phases:
 * 1. Authentication & RBAC token issuance (Phase 1)
 * 2. Resource catalog search & real-time Availability Engine (Phase 2)
 * 3. AI Assistant natural language recommendation & prefill action generation (Phase 4)
 * 4. Atomic transaction booking creation & 409 Conflict rejection invariant (Phase 3)
 * 5. Administrative approval queue & user cancellation workflow (Phase 3 & 5)
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

describe('Step 5.8: Full-Stack End-to-End System Smoke Test', () => {
  // Test User Entities
  const studentA = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Alice Johnson',
    email: 'alice.e2e@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const studentB = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Bob Smith',
    email: 'bob.e2e@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'System Admin',
    email: 'admin.e2e@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const studentAToken = generateAccessToken(studentA);
  const studentBToken = generateAccessToken(studentB);
  const adminToken = generateAccessToken(adminUser);

  // Test Resource Facility
  const mockHallId = new mongoose.Types.ObjectId().toString();
  const mockHall = {
    _id: mockHallId,
    name: 'Grand Einstein Auditorium',
    type: RESOURCE_TYPES.AUDITORIUM,
    capacity: 250,
    location: {
      building: 'Main Campus Center',
      floor: 1,
      roomNumber: 'AUD-100',
    },
    amenities: ['Stage', 'Surround Sound', 'Dual 4K Projectors', 'Wireless Mics'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const bookingStore = new Map();

  beforeAll(() => {
    // Mock user lookup
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      const id = query._id?.toString();
      if (id === studentA._id || query.email === studentA.email) return Promise.resolve(studentA);
      if (id === studentB._id || query.email === studentB.email) return Promise.resolve(studentB);
      if (id === adminUser._id || query.email === adminUser.email) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });

    // Mock resource lookup
    jest.spyOn(Resource, 'find').mockImplementation((query) => {
      const getResourceList = () => {
        let list = [mockHall];
        if (query.type) list = list.filter((r) => r.type === query.type);
        if (query.capacity?.$gte) list = list.filter((r) => r.capacity >= query.capacity.$gte);
        return list;
      };

      const docs = getResourceList();
      return {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(docs),
          then: (resolve) => resolve(docs),
        }),
        lean: jest.fn().mockResolvedValue(docs),
        then: (resolve) => resolve(docs),
      };
    });

    jest.spyOn(Resource, 'countDocuments').mockResolvedValue(1);

    jest.spyOn(Resource, 'findOne').mockImplementation((query) => {
      const id = (query._id?._id || query._id)?.toString();
      const doc = id === mockHallId ? mockHall : null;
      return {
        ...doc,
        populate: jest.fn().mockImplementation(() => Promise.resolve(doc)),
        session: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(doc),
          then: (resolve) => resolve(doc),
        }),
        then: (resolve) => resolve(doc),
      };
    });

    // Mock booking queries
    jest.spyOn(Booking, 'find').mockImplementation((query) => {
      const getList = () => {
        const resId = query.resourceId?.toString();
        let list = Array.from(bookingStore.values()).filter(
          (b) => b.resourceId === resId || b.resourceId?._id === resId
        );

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
        return list;
      };

      return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
          }),
        }),
        lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
      };
    });

    jest.spyOn(Booking, 'create').mockImplementation(async (docs) => {
      const docData = Array.isArray(docs) ? docs[0] : docs;
      const id = new mongoose.Types.ObjectId().toString();
      const savedDoc = {
        _id: id,
        resourceId: mockHall,
        bookedBy: studentA,
        title: docData.title,
        description: docData.description || '',
        startTime: docData.startTime,
        endTime: docData.endTime,
        status: docData.status || BOOKING_STATUS.PENDING,
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

  // Global test state
  let aiPrefillPayload = null;
  let createdBookingId = null;

  describe('1. Resource Discovery & Real-Time Availability Engine', () => {
    test('Student browses catalog and retrieves auditorium matching capacity requirements', async () => {
      const res = await request(app)
        .get('/api/v1/resources?type=auditorium&minCapacity=200')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resources.length).toBeGreaterThan(0);
      expect(res.body.data.resources[0].name).toBe('Grand Einstein Auditorium');
    });

    test('Checks initial open slot availability on target resource facility', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${mockHallId}/availability?date=${tomorrowStr}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
      expect(res.body.data.availableSlotsCount).toBeGreaterThan(0);
    });
  });

  describe('2. AI Assistant Natural Language Query & Action Generation', () => {
    test('AI Advisor processes prompt, matches auditorium, and generates PREFILL_BOOKING action chip', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          prompt: 'Find an available auditorium for 200 people tomorrow morning',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestedResources[0].name).toBe('Grand Einstein Auditorium');

      const prefill = res.body.data.suggestedActions.find((a) => a.action === 'PREFILL_BOOKING');
      expect(prefill).toBeDefined();
      expect(prefill.payload.resourceId).toBe(mockHallId);

      aiPrefillPayload = prefill.payload;
    });
  });

  describe('3. Atomic Booking Creation & Non-Negotiable Double-Booking Invariant', () => {
    test('Student A creates reservation using AI prefill payload (201 Created)', async () => {
      expect(aiPrefillPayload).not.toBeNull();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          resourceId: aiPrefillPayload.resourceId,
          title: aiPrefillPayload.title,
          description: 'Grand Annual Academic Conference',
          startTime: aiPrefillPayload.startTime,
          endTime: aiPrefillPayload.endTime,
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.PENDING);

      createdBookingId = res.body.data.booking._id;
    });

    test('Student B concurrently attempts overlapping reservation and is rejected with 409 Conflict', async () => {
      expect(aiPrefillPayload).not.toBeNull();

      const conflictRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentBToken}`)
        .send({
          resourceId: aiPrefillPayload.resourceId,
          title: 'Competing Student Event',
          description: 'Attempting colliding time slot',
          startTime: aiPrefillPayload.startTime,
          endTime: aiPrefillPayload.endTime,
        });

      expect(conflictRes.status).toBe(HTTP_STATUS.CONFLICT);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe('BOOKING_CONFLICT');
      expect(conflictRes.body.error.conflictingBookingId).toBe(createdBookingId);
      expect(conflictRes.body.error.suggestedSlots).toBeDefined();
      expect(conflictRes.body.error.suggestedSlots.length).toBeGreaterThan(0);
    });
  });

  describe('4. Administrative Approval & Cancellation Lifecycle', () => {
    test('Administrator reviews and approves Student A reservation (200 OK)', async () => {
      expect(createdBookingId).not.toBeNull();

      const approveRes = await request(app)
        .patch(`/api/v1/bookings/${createdBookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(HTTP_STATUS.OK);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.booking.status).toBe(BOOKING_STATUS.APPROVED);
    });

    test('Student A cancels approved reservation (200 OK)', async () => {
      expect(createdBookingId).not.toBeNull();

      const cancelRes = await request(app)
        .patch(`/api/v1/bookings/${createdBookingId}/cancel`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(cancelRes.status).toBe(HTTP_STATUS.OK);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.booking.status).toBe(BOOKING_STATUS.CANCELLED);
    });
  });
});
