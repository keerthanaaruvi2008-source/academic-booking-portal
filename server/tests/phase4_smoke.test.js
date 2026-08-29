/**
 * @fileoverview Phase 4 End-to-End Smoke Test.
 * Validates the complete AI Assistant lifecycle: natural language query processing, parameter extraction,
 * conflict-aware slot calculation, action chip generation, and transition into atomic booking creation.
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

describe('Step 4.8: Phase 4 AI Assistant & NL Recommendation Smoke Test', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student AI User',
    email: 'ai_student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const studentToken = generateAccessToken(studentUser);

  const mockHallId = new mongoose.Types.ObjectId().toString();
  const mockLabId = new mongoose.Types.ObjectId().toString();

  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const mockHall = {
    _id: mockHallId,
    name: 'Marie Curie Seminar Hall',
    type: RESOURCE_TYPES.SEMINAR_HALL,
    capacity: 120,
    location: {
      building: 'East Science Complex',
      floor: 1,
      roomNumber: 'HALL-A',
    },
    amenities: ['Stage', 'Surround Sound', 'Projector'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const mockLab = {
    _id: mockLabId,
    name: 'Ada Lovelace Computer Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 40,
    location: {
      building: 'Turing Block',
      floor: 3,
      roomNumber: 'LAB-302',
    },
    amenities: ['Workstations', 'High-Speed Internet'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const existingBooking = {
    _id: new mongoose.Types.ObjectId().toString(),
    resourceId: mockHallId,
    startTime: `${tomorrowStr}T09:00:00.000Z`,
    endTime: `${tomorrowStr}T11:00:00.000Z`,
    status: BOOKING_STATUS.APPROVED,
  };

  const bookingStore = new Map([[existingBooking._id, existingBooking]]);

  beforeAll(() => {
    // Mock user lookup
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      return Promise.resolve(null);
    });

    // Mock resource lookup
    jest.spyOn(Resource, 'find').mockImplementation((query) => ({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          let list = [mockHall, mockLab];
          if (query.type) {
            list = list.filter((r) => r.type === query.type);
          }
          if (query.capacity?.$gte) {
            list = list.filter((r) => r.capacity >= query.capacity.$gte);
          }
          return Promise.resolve(list);
        }),
      }),
    }));

    jest.spyOn(Resource, 'findOne').mockImplementation((query) => {
      const id = query._id?.toString();
      let doc = null;
      if (id === mockHallId) doc = mockHall;
      if (id === mockLabId) doc = mockLab;

      return {
        populate: jest.fn().mockResolvedValue(doc),
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
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockImplementation(() => Promise.resolve(getList())),
          }),
        }),
      };
    });

    // Mock booking creation
    jest.spyOn(Booking, 'create').mockImplementation(async (docs) => {
      const docData = Array.isArray(docs) ? docs[0] : docs;
      const id = new mongoose.Types.ObjectId().toString();
      const savedDoc = {
        _id: id,
        resourceId: mockHall,
        bookedBy: studentUser,
        title: docData.title,
        description: docData.description || '',
        startTime: docData.startTime,
        endTime: docData.endTime,
        status: docData.status || BOOKING_STATUS.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        save: jest.fn().mockResolvedValue(true),
      };
      bookingStore.set(id, savedDoc);
      return Array.isArray(docs) ? [savedDoc] : savedDoc;
    });

    // Mock booking findById
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
        save: jest.fn().mockResolvedValue(found),
      };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let prefillActionPayload = null;

  describe('1. Natural Language Query & Action Generation Flow', () => {
    test('Processes natural language query for seminar hall and returns structured action chips', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          prompt: 'Find an available seminar hall for 100 students tomorrow morning',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);

      const aiData = res.body.data;
      expect(aiData.intent).toBe('check_availability');
      expect(aiData.extractedParams.resourceType).toBe(RESOURCE_TYPES.SEMINAR_HALL);
      expect(aiData.extractedParams.minCapacity).toBe(100);
      expect(aiData.extractedParams.timeWindow.name).toBe('morning');

      // Assert Curie Seminar Hall was matched
      expect(aiData.suggestedResources).toHaveLength(1);
      expect(aiData.suggestedResources[0].name).toBe('Marie Curie Seminar Hall');

      // Assert suggestedSlots are present
      expect(aiData.suggestedSlots.length).toBeGreaterThan(0);

      // Assert PREFILL_BOOKING action is generated
      const prefillAction = aiData.suggestedActions.find((a) => a.action === 'PREFILL_BOOKING');
      expect(prefillAction).toBeDefined();
      expect(prefillAction.payload.resourceId).toBe(mockHallId);
      expect(prefillAction.payload.startTime).toBeDefined();
      expect(prefillAction.payload.endTime).toBeDefined();

      prefillActionPayload = prefillAction.payload;
    });

    test('Seamlessly submits booking using AI-generated prefill payload into atomic booking engine (201 Created)', async () => {
      expect(prefillActionPayload).not.toBeNull();

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: prefillActionPayload.resourceId,
          title: prefillActionPayload.title,
          description: 'Created via AI Advisor Recommendation',
          startTime: prefillActionPayload.startTime,
          endTime: prefillActionPayload.endTime,
        });

      expect(bookingRes.status).toBe(HTTP_STATUS.CREATED);
      expect(bookingRes.body.success).toBe(true);
      expect(bookingRes.body.data.booking._id).toBeDefined();
      expect(bookingRes.body.data.booking.status).toBe(BOOKING_STATUS.PENDING);
    });
  });

  describe('2. Policy & FAQ Queries', () => {
    test('Answers policy inquiry regarding cancellations and double-booking with structured FAQ envelope', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          prompt: 'How to cancel a booking and what is the policy on double booking?',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('faq');
      expect(res.body.data.naturalLanguageResponse).toContain('Academic Booking Portal FAQ');
      expect(res.body.data.suggestedActions.some((a) => a.action === 'NAVIGATE')).toBe(true);
    });
  });

  describe('3. Robustness & Offline Resilience', () => {
    test('Handles out-of-domain prompt gracefully without runtime exceptions', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          prompt: 'What is the capital of France?',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('general');
    });
  });
});
