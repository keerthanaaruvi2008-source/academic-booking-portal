import { jest } from '@jest/globals';
import * as bookingService from '../src/services/bookingService.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { ROLES, BOOKING_STATUS, RESOURCE_STATUS, RESOURCE_TYPES, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 3.2: Booking Domain Service Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.STUDENT,
  };

  const otherStudentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.STUDENT,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.ADMIN,
  };

  const mockBookingId = new mongoose.Types.ObjectId().toString();
  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockActiveResource = {
    _id: mockResourceId,
    name: 'Seminar Hall 1',
    type: RESOURCE_TYPES.SEMINAR_HALL,
    capacity: 100,
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const mockBooking = {
    _id: mockBookingId,
    resourceId: {
      _id: mockResourceId,
      name: 'Seminar Hall 1',
    },
    bookedBy: {
      _id: studentUser._id,
      name: 'Student User',
      email: 'student@university.edu',
    },
    approvedBy: null,
    title: 'Research Meeting',
    startTime: new Date('2026-09-25T10:00:00.000Z'),
    endTime: new Date('2026-09-25T12:00:00.000Z'),
    status: BOOKING_STATUS.PENDING,
    save: jest.fn().mockResolvedValue(true),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBooking', () => {
    test('Creates booking on available resource with clear schedule', async () => {
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
              ...mockBooking,
              _id: createdId,
            }),
          }),
        }),
      });

      const result = await bookingService.createBooking(
        {
          resourceId: mockResourceId,
          title: 'Research Meeting',
          startTime: '2026-09-25T10:00:00.000Z',
          endTime: '2026-09-25T12:00:00.000Z',
        },
        studentUser
      );

      expect(result._id).toBe(createdId);
    });
  });

  describe('getBookingById', () => {
    test('Throws 400 on invalid ObjectId', async () => {
      await expect(bookingService.getBookingById('bad-id', studentUser)).rejects.toThrow(
        'Invalid booking identifier format.'
      );
    });

    test('Throws 404 when booking not found', async () => {
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(null),
          }),
        }),
      });

      await expect(bookingService.getBookingById(mockBookingId, studentUser)).rejects.toThrow(
        'Booking not found.'
      );
    });

    test('Throws 403 when non-owner student accesses someone else booking', async () => {
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(mockBooking),
          }),
        }),
      });

      await expect(bookingService.getBookingById(mockBookingId, otherStudentUser)).rejects.toThrow(
        'You are not authorized to view this booking.'
      );
    });

    test('Allows owner student to view their booking', async () => {
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(mockBooking),
          }),
        }),
      });

      const res = await bookingService.getBookingById(mockBookingId, studentUser);
      expect(res._id).toBe(mockBookingId);
    });

    test('Allows admin to view any booking', async () => {
      jest.spyOn(Booking, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockResolvedValueOnce(mockBooking),
          }),
        }),
      });

      const res = await bookingService.getBookingById(mockBookingId, adminUser);
      expect(res._id).toBe(mockBookingId);
    });
  });

  describe('listBookings', () => {
    test('Scopes query to user own bookings for students', async () => {
      jest.spyOn(Booking, 'countDocuments').mockResolvedValueOnce(1);
      const findSpy = jest.spyOn(Booking, 'find').mockReturnValueOnce({
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

      const res = await bookingService.listBookings({ page: 1, limit: 10 }, studentUser);

      expect(res.bookings).toHaveLength(1);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bookedBy: studentUser._id,
        })
      );
    });

    test('Allows admin to query all bookings without user scoping', async () => {
      jest.spyOn(Booking, 'countDocuments').mockResolvedValueOnce(2);
      const findSpy = jest.spyOn(Booking, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            populate: jest.fn().mockReturnValueOnce({
              sort: jest.fn().mockReturnValueOnce({
                skip: jest.fn().mockReturnValueOnce({
                  limit: jest.fn().mockResolvedValueOnce([mockBooking, mockBooking]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await bookingService.listBookings({ status: BOOKING_STATUS.PENDING }, adminUser);

      expect(res.bookings).toHaveLength(2);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BOOKING_STATUS.PENDING,
        })
      );
      expect(findSpy.mock.calls[0][0].bookedBy).toBeUndefined();
    });
  });

  describe('approveBooking', () => {
    test('Rejects non-admin approval attempt with 403', async () => {
      await expect(bookingService.approveBooking(mockBookingId, studentUser)).rejects.toThrow(
        'Only administrators can approve reservations.'
      );
    });

    test('Rejects approval of already cancelled booking with 400', async () => {
      jest.spyOn(Booking, 'findById').mockResolvedValueOnce({
        ...mockBooking,
        status: BOOKING_STATUS.CANCELLED,
      });

      await expect(bookingService.approveBooking(mockBookingId, adminUser)).rejects.toThrow(
        'Cannot approve a reservation that is already cancelled.'
      );
    });

    test('Successfully approves pending booking', async () => {
      const mockPendingDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...mockPendingDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...mockPendingDoc,
                  status: BOOKING_STATUS.APPROVED,
                  approvedBy: { _id: adminUser._id },
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

      const result = await bookingService.approveBooking(mockBookingId, adminUser);
      expect(result.status).toBe(BOOKING_STATUS.APPROVED);
    });
  });

  describe('rejectBooking', () => {
    test('Rejects non-admin rejection attempt with 403', async () => {
      await expect(
        bookingService.rejectBooking(mockBookingId, 'Slot unavailable', studentUser)
      ).rejects.toThrow('Only administrators can reject reservations.');
    });

    test('Successfully rejects booking and records reason', async () => {
      const mockPendingDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...mockPendingDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...mockPendingDoc,
                  status: BOOKING_STATUS.REJECTED,
                  rejectionReason: 'Maintenance scheduled',
                }),
              }),
            }),
          };
        }
        return Promise.resolve(null);
      });

      const result = await bookingService.rejectBooking(
        mockBookingId,
        'Maintenance scheduled',
        adminUser
      );
      expect(result.status).toBe(BOOKING_STATUS.REJECTED);
      expect(result.rejectionReason).toBe('Maintenance scheduled');
    });
  });

  describe('cancelBooking', () => {
    test('Rejects cancellation by unauthorized non-owner student with 403', async () => {
      jest.spyOn(Booking, 'findById').mockResolvedValueOnce(mockBooking);

      await expect(bookingService.cancelBooking(mockBookingId, otherStudentUser)).rejects.toThrow(
        'You are only authorized to cancel your own reservations.'
      );
    });

    test('Allows owner student to cancel their booking', async () => {
      const mockActiveDoc = {
        ...mockBooking,
        status: BOOKING_STATUS.PENDING,
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(Booking, 'findById').mockImplementation((id) => {
        if (id === mockBookingId) {
          return {
            ...mockActiveDoc,
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                  ...mockActiveDoc,
                  status: BOOKING_STATUS.CANCELLED,
                }),
              }),
            }),
          };
        }
        return Promise.resolve(null);
      });

      const result = await bookingService.cancelBooking(mockBookingId, studentUser);
      expect(result.status).toBe(BOOKING_STATUS.CANCELLED);
    });
  });
});
