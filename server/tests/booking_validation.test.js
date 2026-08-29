import {
  createBookingSchema,
  rejectBookingSchema,
  listBookingQuerySchema,
  bookingIdParamSchema,
} from '../src/validations/bookingValidation.js';
import { BOOKING_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 3.3: Booking Validation Schemas Verification', () => {
  const validResourceId = new mongoose.Types.ObjectId().toString();
  const validBookingId = new mongoose.Types.ObjectId().toString();

  describe('createBookingSchema', () => {
    const validBooking = {
      resourceId: validResourceId,
      title: 'Neural Networks Seminar',
      description: 'Weekly presentation by research group.',
      startTime: '2026-09-20T10:00:00.000Z',
      endTime: '2026-09-20T12:00:00.000Z',
    };

    test('Passes with valid payload', () => {
      const result = createBookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(validBooking.title);
    });

    test('Fails when resourceId is not a valid 24-char hex ObjectId', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        resourceId: 'not-valid-id',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Invalid resource identifier');
    });

    test('Fails when title is shorter than 3 characters', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        title: 'AB',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('at least 3 characters');
    });

    test('Fails when startTime is not a valid ISO datetime string', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        startTime: '2026-09-20',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('valid ISO 8601');
    });

    test('Fails when endTime <= startTime (inverted time interval)', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        startTime: '2026-09-20T14:00:00.000Z',
        endTime: '2026-09-20T12:00:00.000Z',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('strictly after start time');
    });

    test('Fails when duration is less than 15 minutes', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        startTime: '2026-09-20T10:00:00.000Z',
        endTime: '2026-09-20T10:10:00.000Z', // 10 minutes
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('between 15 minutes and 12 hours');
    });

    test('Fails when duration exceeds 12 hours', () => {
      const result = createBookingSchema.safeParse({
        ...validBooking,
        startTime: '2026-09-20T06:00:00.000Z',
        endTime: '2026-09-20T20:00:00.000Z', // 14 hours
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('between 15 minutes and 12 hours');
    });
  });

  describe('rejectBookingSchema', () => {
    test('Passes with valid reason', () => {
      const result = rejectBookingSchema.safeParse({
        rejectionReason: 'The hall is reserved for institutional convocation.',
      });
      expect(result.success).toBe(true);
    });

    test('Fails when reason is shorter than 5 characters', () => {
      const result = rejectBookingSchema.safeParse({
        rejectionReason: 'No',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('at least 5 characters');
    });
  });

  describe('listBookingQuerySchema', () => {
    test('Coerces query params and applies defaults', () => {
      const result = listBookingQuerySchema.safeParse({
        page: '2',
        limit: '15',
        status: BOOKING_STATUS.APPROVED,
      });
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(15);
      expect(result.data.status).toBe(BOOKING_STATUS.APPROVED);
      expect(result.data.sortBy).toBe('startTime');
      expect(result.data.sortOrder).toBe('desc');
    });

    test('Fails on invalid status enum', () => {
      const result = listBookingQuerySchema.safeParse({
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bookingIdParamSchema', () => {
    test('Passes with valid 24-char hex ObjectId', () => {
      const result = bookingIdParamSchema.safeParse({
        id: validBookingId,
      });
      expect(result.success).toBe(true);
    });

    test('Fails with invalid ObjectId string', () => {
      const result = bookingIdParamSchema.safeParse({
        id: '123-bad-id',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Invalid booking identifier format');
    });
  });
});
