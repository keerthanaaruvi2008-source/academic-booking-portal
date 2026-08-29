import { jest } from '@jest/globals';
import * as availabilityEngine from '../src/services/availabilityEngine.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { BOOKING_STATUS, RESOURCE_STATUS, RESOURCE_TYPES } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.5: Availability Engine Verification', () => {
  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockActiveResource = {
    _id: mockResourceId,
    name: 'Smart Lab Alpha',
    type: RESOURCE_TYPES.LAB,
    capacity: 30,
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  };

  const targetDate = '2026-09-01';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkSlotConflict', () => {
    test('Rejects invalid date format with 400', async () => {
      await expect(
        availabilityEngine.checkSlotConflict(mockResourceId, 'not-a-date', 'also-not-a-date')
      ).rejects.toThrow('Invalid start or end time format.');
    });

    test('Rejects inverted interval (startTime >= endTime) with 400', async () => {
      const start = '2026-09-01T14:00:00.000Z';
      const end = '2026-09-01T12:00:00.000Z';

      await expect(
        availabilityEngine.checkSlotConflict(mockResourceId, start, end)
      ).rejects.toThrow('Start time must be strictly before end time.');
    });

    test('Returns hasConflict: false when no overlapping bookings exist', async () => {
      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await availabilityEngine.checkSlotConflict(
        mockResourceId,
        '2026-09-01T09:00:00.000Z',
        '2026-09-01T11:00:00.000Z'
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingBookings).toHaveLength(0);
    });

    test('Returns hasConflict: true when overlapping booking exists', async () => {
      const mockConflict = {
        _id: 'booking_123',
        title: 'Algorithms Lecture',
        startTime: new Date('2026-09-01T10:00:00.000Z'),
        endTime: new Date('2026-09-01T12:00:00.000Z'),
        status: BOOKING_STATUS.APPROVED,
      };

      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([mockConflict]),
        }),
      });

      const result = await availabilityEngine.checkSlotConflict(
        mockResourceId,
        '2026-09-01T11:00:00.000Z',
        '2026-09-01T13:00:00.000Z'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBookings).toHaveLength(1);
      expect(result.conflictingBookings[0]._id).toBe('booking_123');
    });
  });

  describe('getAvailableSlots', () => {
    test('Rejects invalid date string format', async () => {
      await expect(
        availabilityEngine.getAvailableSlots(mockResourceId, '01-09-2026')
      ).rejects.toThrow('Target date is required in YYYY-MM-DD format');
    });

    test('Returns non-operational summary if resource is in maintenance', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          ...mockActiveResource,
          status: RESOURCE_STATUS.MAINTENANCE,
        }),
      });

      const result = await availabilityEngine.getAvailableSlots(mockResourceId, targetDate);

      expect(result.isOperational).toBe(false);
      expect(result.status).toBe(RESOURCE_STATUS.MAINTENANCE);
      expect(result.availableSlotsCount).toBe(0);
      expect(result.slots).toHaveLength(0);
    });

    test('Computes 12 free slots for 08:00 to 20:00 on empty schedule', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockActiveResource),
      });
      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await availabilityEngine.getAvailableSlots(mockResourceId, targetDate, {
        startHour: 8,
        endHour: 20,
        slotDurationMinutes: 60,
      });

      expect(result.isOperational).toBe(true);
      expect(result.totalSlots).toBe(12);
      expect(result.availableSlotsCount).toBe(12);
      expect(result.slots.every((s) => s.available)).toBe(true);
    });

    test('Accurately marks occupied slots for multi-hour booking', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockActiveResource),
      });

      // Existing booking from 10:00 to 12:00 UTC (occupies two 60-min slots: 10-11 and 11-12)
      const existingBooking = {
        _id: 'booking_456',
        title: 'Robotics Workshop',
        status: BOOKING_STATUS.APPROVED,
        startTime: '2026-09-01T10:00:00.000Z',
        endTime: '2026-09-01T12:00:00.000Z',
      };

      jest.spyOn(Booking, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([existingBooking]),
        }),
      });

      const result = await availabilityEngine.getAvailableSlots(mockResourceId, targetDate, {
        startHour: 8,
        endHour: 14, // 6 slots: 08-09, 09-10, 10-11, 11-12, 12-13, 13-14
        slotDurationMinutes: 60,
      });

      expect(result.totalSlots).toBe(6);
      expect(result.availableSlotsCount).toBe(4);

      // Slot 10:00-11:00 should be unavailable
      const slot10to11 = result.slots.find((s) => s.startTime === '2026-09-01T10:00:00.000Z');
      expect(slot10to11.available).toBe(false);
      expect(slot10to11.conflict.bookingId).toBe('booking_456');

      // Slot 11:00-12:00 should be unavailable
      const slot11to12 = result.slots.find((s) => s.startTime === '2026-09-01T11:00:00.000Z');
      expect(slot11to12.available).toBe(false);

      // Slot 09:00-10:00 should be available
      const slot09to10 = result.slots.find((s) => s.startTime === '2026-09-01T09:00:00.000Z');
      expect(slot09to10.available).toBe(true);
    });
  });
});
