import request from 'supertest';
import app from '../src/app.js';
import {
  ROLES,
  ROLE_LIST,
  BOOKING_STATUS,
  BOOKING_STATUS_LIST,
  ACTIVE_LOCK_STATUSES,
  RESOURCE_TYPES,
  RESOURCE_STATUS,
  PAGINATION,
  HTTP_STATUS,
} from '../src/config/constants.js';
import { connectDB } from '../src/config/db.js';

describe('Step 1.1: Server Bootstrap Verification', () => {
  describe('Constants & Enums', () => {
    test('ROLES contains student, faculty, admin', () => {
      expect(ROLES.STUDENT).toBe('student');
      expect(ROLES.FACULTY).toBe('faculty');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLE_LIST).toEqual(['student', 'faculty', 'admin']);
    });

    test('BOOKING_STATUS contains pending, approved, rejected, cancelled', () => {
      expect(BOOKING_STATUS.PENDING).toBe('pending');
      expect(BOOKING_STATUS.APPROVED).toBe('approved');
      expect(BOOKING_STATUS.REJECTED).toBe('rejected');
      expect(BOOKING_STATUS.CANCELLED).toBe('cancelled');
      expect(BOOKING_STATUS_LIST).toEqual(['pending', 'approved', 'rejected', 'cancelled']);
    });

    test('ACTIVE_LOCK_STATUSES contains pending and approved', () => {
      expect(ACTIVE_LOCK_STATUSES).toEqual(['pending', 'approved']);
    });

    test('RESOURCE_TYPES contains standard institutional types', () => {
      expect(RESOURCE_TYPES.SEMINAR_HALL).toBe('seminar_hall');
      expect(RESOURCE_TYPES.LAB).toBe('lab');
      expect(RESOURCE_TYPES.CLASSROOM).toBe('classroom');
    });

    test('PAGINATION defaults are configured', () => {
      expect(PAGINATION.DEFAULT_PAGE).toBe(1);
      expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
      expect(PAGINATION.MAX_LIMIT).toBe(100);
    });

    test('Constants are immutable (frozen)', () => {
      expect(Object.isFrozen(ROLES)).toBe(true);
      expect(Object.isFrozen(BOOKING_STATUS)).toBe(true);
      expect(Object.isFrozen(PAGINATION)).toBe(true);
      expect(Object.isFrozen(HTTP_STATUS)).toBe(true);
    });
  });

  describe('Database Connection Validation', () => {
    test('connectDB throws fail-fast error when MONGO_URI is missing', async () => {
      const originalUri = process.env.MONGO_URI;
      delete process.env.MONGO_URI;

      await expect(connectDB()).rejects.toThrow(
        'FATAL: MONGO_URI environment variable is not defined. Failing fast.'
      );

      process.env.MONGO_URI = originalUri;
    });
  });

  describe('Express App & Endpoints', () => {
    test('GET /health returns 200 and standard envelope', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.service).toBe('academic-booking-server');
      expect(res.body.data.timestamp).toBeDefined();
    });

    test('GET /api/v1/health returns 200 and standard envelope', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });

    test('GET /api/v1/nonexistent returns 404 with structured error envelope', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(res.body.error.message).toContain('/api/v1/nonexistent');
    });

    test('App has security headers from helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
