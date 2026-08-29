import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 4.5: AI Routes & Role Access Integration Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student User',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const facultyUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Professor Smith',
    email: 'faculty@university.edu',
    role: ROLES.FACULTY,
    isActive: true,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Administrator',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const studentToken = generateAccessToken(studentUser);
  const facultyToken = generateAccessToken(facultyUser);
  const adminToken = generateAccessToken(adminUser);

  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      if (query._id === facultyUser._id) return Promise.resolve(facultyUser);
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });

    jest.spyOn(Resource, 'find').mockImplementation(() => ({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId().toString(),
            name: 'Science Lecture Hall A',
            type: 'classroom',
            capacity: 60,
            status: 'available',
            isActive: true,
            location: { building: 'Main Block', floor: 1, roomNumber: '101' },
          },
        ]),
      }),
    }));

    jest.spyOn(Resource, 'findOne').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Science Lecture Hall A',
        type: 'classroom',
        capacity: 60,
        status: 'available',
        isActive: true,
        location: { building: 'Main Block', floor: 1, roomNumber: '101' },
      }),
    }));

    jest.spyOn(Booking, 'find').mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/ai/query', () => {
    test('Rejects unauthenticated query with 401', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .send({ prompt: 'Find a room for 50 people' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects invalid or empty prompt with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ prompt: '' });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });

    test('Allows Student queries returning 200 OK with structured envelope', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ prompt: 'Find a classroom with capacity 50 for tomorrow morning' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBeDefined();
      expect(res.body.data.extractedParams.minCapacity).toBe(50);
      expect(Array.isArray(res.body.data.suggestedResources)).toBe(true);
      expect(Array.isArray(res.body.data.suggestedSlots)).toBe(true);
      expect(Array.isArray(res.body.data.suggestedActions)).toBe(true);
    });

    test('Allows Faculty queries returning 200 OK', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ prompt: 'Find seminar hall for 80 attendees next week' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
    });

    test('Allows Admin queries returning 200 OK', async () => {
      const res = await request(app)
        .post('/api/v1/ai/query')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ prompt: 'Check availability for main auditorium' });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
    });
  });
});
