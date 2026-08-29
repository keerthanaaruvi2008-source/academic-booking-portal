import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.6: Availability Routes Integration Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student Tester',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockResource = {
    _id: mockResourceId,
    name: 'Turing Computer Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 40,
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const studentToken = generateAccessToken(studentUser);

  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/resources/:id/availability', () => {
    test('Rejects unauthenticated request with 401', async () => {
      const res = await request(app).get(`/api/v1/resources/${mockResourceId}/availability?date=2026-09-01`);
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects request without date query parameter with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${mockResourceId}/availability`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Rejects request with invalid date format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get(`/api/v1/resources/${mockResourceId}/availability?date=01-09-2026`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Rejects invalid resource ID format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/resources/not-valid-id/availability?date=2026-09-01')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Returns 404 if resource does not exist', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null),
      });

      const res = await request(app)
        .get(`/api/v1/resources/${mockResourceId}/availability?date=2026-09-01`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    test('Returns 200 and computed slots for valid request', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockResource),
      });
      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([]),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/resources/${mockResourceId}/availability?date=2026-09-01`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resourceId).toBe(mockResourceId);
      expect(res.body.data.date).toBe('2026-09-01');
      expect(res.body.data.isOperational).toBe(true);
      expect(Array.isArray(res.body.data.slots)).toBe(true);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
    });
  });
});
