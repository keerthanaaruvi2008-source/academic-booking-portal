import { jest } from '@jest/globals';
import * as bookingConflictService from '../src/services/bookingConflictService.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { ROLES, BOOKING_STATUS, RESOURCE_STATUS, RESOURCE_TYPES, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 3.1: Booking Conflict Service Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.STUDENT,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.ADMIN,
  };

  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockActiveResource = {
    _id: mockResourceId,
    name: 'Main Auditorium',
    type: RESOURCE_TYPES.AUDITORIUM,
    capacity: 300,
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isTransactionUnsupportedError Helper', () => {
    test('Detects replica set missing error string', () => {
      const err = new Error('Transaction numbers are only allowed on a replica set member or mongos');
      expect(bookingConflictService.isTransactionUnsupportedError(err)).toBe(true);
    });

    test('Detects code 20 IllegalOperation error', () => {
      const err = new Error('Some error');
      err.code = 20;
      expect(bookingConflictService.isTransactionUnsupportedError(err)).toBe(true);
    });

    test('Returns false for standard validation error', () => {
      const err = new Error('E11000 duplicate key error');
      expect(bookingConflictService.isTransactionUnsupportedError(err)).toBe(false);
    });
  });

  describe('executeAtomicBookingCreation - Interval & Resource Validation', () => {
    test('Rejects inverted interval (startTime >= endTime) with 400', async () => {
      await expect(
        bookingConflictService.executeAtomicBookingCreation(
          {
            resourceId: mockResourceId,
            title: 'Guest Lecture',
            startTime: '2026-09-20T14:00:00.000Z',
            endTime: '2026-09-20T12:00:00.000Z',
          },
          studentUser
        )
      ).rejects.toThrow('Start time must be strictly before end time.');
    });

    test('Rejects reservation on resource in maintenance status', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          ...mockActiveResource,
          status: RESOURCE_STATUS.MAINTENANCE,
        }),
      });

      await expect(
        bookingConflictService.executeAtomicBookingCreation(
          {
            resourceId: mockResourceId,
            title: 'Guest Lecture',
            startTime: '2026-09-20T10:00:00.000Z',
            endTime: '2026-09-20T12:00:00.000Z',
          },
          studentUser
        )
      ).rejects.toThrow('maintenance and cannot be reserved');
    });
  });

  describe('executeAtomicBookingCreation - Conflict Detection (409 Envelope)', () => {
    test('Rejects overlapping request with 409 Conflict, returning conflictingBookingId and suggestedSlots', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActiveResource),
      });

      const existingBooking = {
        _id: 'existing_approved_id',
        title: 'Orientation Ceremony',
        status: BOOKING_STATUS.APPROVED,
        startTime: new Date('2026-09-20T10:00:00.000Z'),
        endTime: new Date('2026-09-20T12:00:00.000Z'),
      };

      // Mock finding conflict in checkSlotConflict & checkBookingOverlap
      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([existingBooking]),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([existingBooking]),
        }),
      }));

      try {
        await bookingConflictService.executeAtomicBookingCreation(
          {
            resourceId: mockResourceId,
            title: 'Student Seminar',
            startTime: '2026-09-20T11:00:00.000Z', // Overlaps 10-12
            endTime: '2026-09-20T13:00:00.000Z',
          },
          studentUser
        );
        throw new Error('Should have thrown 409 Conflict error');
      } catch (err) {
        expect(err.statusCode).toBe(HTTP_STATUS.CONFLICT);
        expect(err.code).toBe('BOOKING_CONFLICT');
        expect(err.conflictingBookingId).toBe('existing_approved_id');
        expect(Array.isArray(err.suggestedSlots)).toBe(true);
      }
    });

    test('Rejects overlapping request colliding with a PENDING reservation (Soft-Locking)', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActiveResource),
      });

      const existingPendingBooking = {
        _id: 'existing_pending_id',
        title: 'Pending Faculty Request',
        status: BOOKING_STATUS.PENDING,
        startTime: new Date('2026-09-20T14:00:00.000Z'),
        endTime: new Date('2026-09-20T16:00:00.000Z'),
      };

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([existingPendingBooking]),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([existingPendingBooking]),
        }),
      }));

      try {
        await bookingConflictService.executeAtomicBookingCreation(
          {
            resourceId: mockResourceId,
            title: 'Study Group',
            startTime: '2026-09-20T15:00:00.000Z', // Overlaps 14-16
            endTime: '2026-09-20T17:00:00.000Z',
          },
          studentUser
        );
        throw new Error('Should have thrown 409 Conflict error');
      } catch (err) {
        expect(err.statusCode).toBe(HTTP_STATUS.CONFLICT);
        expect(err.code).toBe('BOOKING_CONFLICT');
        expect(err.conflictingBookingId).toBe('existing_pending_id');
      }
    });
  });

  describe('executeAtomicBookingCreation - Successful Creation & Fallbacks', () => {
    test('Creates PENDING booking for student user on clear schedule', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActiveResource),
      });

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));

      const createdId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Booking, 'create').mockResolvedValue([{ _id: createdId }]);
      jest.spyOn(Booking, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: createdId,
              title: 'Clean Seminar',
              status: BOOKING_STATUS.PENDING,
              bookedBy: { _id: studentUser._id },
            }),
          }),
        }),
      });

      const result = await bookingConflictService.executeAtomicBookingCreation(
        {
          resourceId: mockResourceId,
          title: 'Clean Seminar',
          startTime: '2026-09-20T08:00:00.000Z',
          endTime: '2026-09-20T10:00:00.000Z',
        },
        studentUser
      );

      expect(result.status).toBe(BOOKING_STATUS.PENDING);
    });

    test('Creates PENDING booking requiring administrative approval', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActiveResource),
      });

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));

      const createdId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Booking, 'create').mockResolvedValue([{ _id: createdId }]);
      jest.spyOn(Booking, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: createdId,
              title: 'Faculty Keynote',
              status: BOOKING_STATUS.PENDING,
              approvedBy: null,
            }),
          }),
        }),
      });

      const result = await bookingConflictService.executeAtomicBookingCreation(
        {
          resourceId: mockResourceId,
          title: 'Faculty Keynote',
          startTime: '2026-09-20T12:00:00.000Z',
          endTime: '2026-09-20T14:00:00.000Z',
        },
        adminUser
      );

      expect(result.status).toBe(BOOKING_STATUS.PENDING);
    });

    test('Gracefully falls back to non-transactional creation when replica set is missing', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActiveResource),
      });

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        session: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));

      const createdId = new mongoose.Types.ObjectId().toString();

      // Mock session start
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(),
        abortTransaction: jest.fn().mockResolvedValue(),
        endSession: jest.fn(),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      jest.spyOn(Booking, 'create').mockImplementation((data, opts) => {
        if (opts && opts.session) {
          throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
        }
        return Promise.resolve([{ _id: createdId }]);
      });

      jest.spyOn(Booking, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({
              _id: createdId,
              title: 'Standalone Fallback Booking',
              status: BOOKING_STATUS.PENDING,
              bookedBy: { _id: studentUser._id },
            }),
          }),
        }),
      });

      const result = await bookingConflictService.executeAtomicBookingCreation(
        {
          resourceId: mockResourceId,
          title: 'Standalone Fallback Booking',
          startTime: '2026-09-20T16:00:00.000Z',
          endTime: '2026-09-20T18:00:00.000Z',
        },
        studentUser
      );

      expect(result.status).toBe(BOOKING_STATUS.PENDING);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });
});
