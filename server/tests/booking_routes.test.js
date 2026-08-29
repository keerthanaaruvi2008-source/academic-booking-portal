import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, BOOKING_STATUS, RESOURCE_STATUS, RESOURCE_TYPES, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 3.4: Booking Routes Integration Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student Tester',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Admin Tester',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const mockResourceId = new mongoose.Types.ObjectId().toString();
  const mockBookingId = new mongoose.Types.ObjectId().toString();

  const mockResource = {
    _id: mockResourceId,
    name: 'Auditorium Hall',
    type: RESOURCE_TYPES.AUDITORIUM,
    capacity: 250,
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const mockBooking = {
    _id: mockBookingId,
    resourceId: mockResource,
    bookedBy: studentUser,
    approvedBy: null,
    title: 'Hackathon Briefing',
    startTime: '2026-09-20T10:00:00.000Z',
    endTime: '2026-09-20T12:00:00.000Z',
    status: BOOKING_STATUS.PENDING,
    save: jest.fn().mockResolvedValue(true),
  };

  const studentToken = generateAccessToken(studentUser);
  const adminToken = generateAccessToken(adminUser);

  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/bookings', () => {
    test('Rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({ resourceId: mockResourceId, title: 'Test' });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects payload with invalid ISO format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Hackathon Briefing',
          startTime: 'invalid-date',
          endTime: 'invalid-date',
        });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Returns 201 when booking is successfully created', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockResource),
      });
      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));
      jest.spyOn(Booking, 'create').mockResolvedValueOnce([{ _id: mockBookingId }]);
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(mockBooking),
          }),
        }),
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Hackathon Briefing',
          startTime: '2026-09-20T10:00:00.000Z',
          endTime: '2026-09-20T12:00:00.000Z',
        });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking._id).toBe(mockBookingId);
    });

    test('Returns 409 Conflict with suggestedSlots when time slot overlaps', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockResource),
      });

      const activeBooking = {
        _id: 'colliding_id',
        title: 'Orientation',
        startTime: new Date('2026-09-20T10:00:00.000Z'),
        endTime: new Date('2026-09-20T12:00:00.000Z'),
        status: BOOKING_STATUS.APPROVED,
      };

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([activeBooking]),
        }),
      }));

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          resourceId: mockResourceId,
          title: 'Colliding Seminar',
          startTime: '2026-09-20T11:00:00.000Z',
          endTime: '2026-09-20T13:00:00.000Z',
        });

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
      expect(res.body.error.conflictingBookingId).toBe('colliding_id');
      expect(Array.isArray(res.body.error.suggestedSlots)).toBe(true);
    });
  });

  describe('GET /api/v1/bookings', () => {
    test('Returns 200 with paginated booking list', async () => {
      jest.spyOn(Booking, 'countDocuments').mockResolvedValueOnce(1);
      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockReturnValueOnce({
              sort: jest.fn().mockReturnValueOnce({
                skip: jest.fn().mockReturnValueOnce({
                  limit: jest.fn().mockResolvedValueOnce([mockBooking]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    test('Returns 200 with booking details for owner', async () => {
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(mockBooking),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/bookings/${mockBookingId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking._id).toBe(mockBookingId);
    });
  });

  describe('PATCH /api/v1/bookings/:id/approve', () => {
    test('Rejects student with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${mockBookingId}/approve`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Allows admin to approve reservation (200 OK)', async () => {
      const pendingDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...pendingDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...pendingDoc,
                  status: BOOKING_STATUS.APPROVED,
                  approvedBy: adminUser,
                }),
              }),
            }),
          };
        }
        return Promise.resolve(null);
      });

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));

      const res = await request(app)
        .patch(`/api/v1/bookings/${mockBookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.APPROVED);
    });
  });

  describe('PATCH /api/v1/bookings/:id/reject', () => {
    test('Rejects missing rejection reason with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${mockBookingId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Allows admin to reject reservation with reason (200 OK)', async () => {
      const pendingDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...pendingDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...pendingDoc,
                  status: BOOKING_STATUS.REJECTED,
                  rejectionReason: 'Room is undergoing sound system calibration.',
                }),
              }),
            }),
          };
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${mockBookingId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Room is undergoing sound system calibration.',
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.REJECTED);
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    test('Allows owner student to cancel reservation (200 OK)', async () => {
      const activeDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...activeDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...activeDoc,
                  status: BOOKING_STATUS.CANCELLED,
                }),
              }),
            }),
          };
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${mockBookingId}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe(BOOKING_STATUS.CANCELLED);
    });
  });
});
