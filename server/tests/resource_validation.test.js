import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { generateAccessToken } from '../src/services/authService.js';
import {
  createResourceSchema,
  updateResourceSchema,
  listResourceQuerySchema,
  resourceIdParamSchema,
} from '../src/validations/resourceValidation.js';
import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.4: Resource Validation Layer Verification', () => {
  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Admin User',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const adminToken = generateAccessToken(adminUser);

  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Zod Schema Unit Validations', () => {
    const validResourcePayload = {
      name: 'Main Conference Room',
      type: RESOURCE_TYPES.SEMINAR_HALL,
      capacity: 50,
      location: {
        building: 'Administration Block',
        floor: 3,
        roomNumber: 'CONF-301',
      },
      amenities: ['Projector', 'Video Conferencing'],
      status: RESOURCE_STATUS.AVAILABLE,
    };

    test('createResourceSchema accepts valid payload', () => {
      const parsed = createResourceSchema.parse(validResourcePayload);
      expect(parsed.name).toBe(validResourcePayload.name);
      expect(parsed.type).toBe(RESOURCE_TYPES.SEMINAR_HALL);
    });

    test('createResourceSchema applies defaults for optional fields', () => {
      const parsed = createResourceSchema.parse({
        name: 'Basic Room',
        capacity: 25,
        location: {
          building: 'North Wing',
          roomNumber: '102',
        },
      });

      expect(parsed.type).toBe(RESOURCE_TYPES.CLASSROOM);
      expect(parsed.status).toBe(RESOURCE_STATUS.AVAILABLE);
      expect(parsed.amenities).toEqual([]);
      expect(parsed.location.floor).toBe(1);
    });

    test('createResourceSchema rejects invalid capacity', () => {
      expect(() =>
        createResourceSchema.parse({
          ...validResourcePayload,
          capacity: 0,
        })
      ).toThrow();
    });

    test('createResourceSchema rejects missing location fields', () => {
      expect(() =>
        createResourceSchema.parse({
          ...validResourcePayload,
          location: {
            building: 'Block A',
            // roomNumber missing
          },
        })
      ).toThrow();
    });

    test('updateResourceSchema allows partial updates', () => {
      const parsed = updateResourceSchema.parse({ capacity: 80 });
      expect(parsed.capacity).toBe(80);
    });

    test('updateResourceSchema rejects empty object', () => {
      expect(() => updateResourceSchema.parse({})).toThrow(
        'At least one field must be provided to update the resource'
      );
    });

    test('listResourceQuerySchema coerces numbers and sets pagination defaults', () => {
      const parsed = listResourceQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.sortBy).toBe('createdAt');
      expect(parsed.sortOrder).toBe('desc');
    });

    test('resourceIdParamSchema accepts valid 24-hex ObjectId and rejects malformed strings', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(resourceIdParamSchema.parse({ id: validId })).toEqual({ id: validId });
      expect(() => resourceIdParamSchema.parse({ id: 'invalid-id' })).toThrow();
    });
  });

  describe('Route-Boundary HTTP Validation Middleware', () => {
    test('POST /api/v1/resources rejects invalid body with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'A', // Too short (min 2)
          capacity: -5, // Negative capacity
        });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBeDefined();
    });

    test('GET /api/v1/resources/:id rejects non-ObjectId params with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/resources/not-a-valid-hex-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('24-character hexadecimal');
    });
  });
});
