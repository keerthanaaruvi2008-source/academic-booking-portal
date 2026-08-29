import { jest } from '@jest/globals';
import { parseNaturalLanguageQuery, processAiQuery } from '../src/services/aiService.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { RESOURCE_TYPES, RESOURCE_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 4.5: AI Domain Service & Heuristic Verification Tests', () => {
  describe('1. Natural Language Parameter Extraction Scenarios', () => {
    test('Extracts minimum capacity and lab type from natural sentence', () => {
      const parsed = parseNaturalLanguageQuery('Find a computer lab with at least 40 workstations');
      expect(parsed.extractedParams.minCapacity).toBe(40);
      expect(parsed.extractedParams.resourceType).toBe(RESOURCE_TYPES.LAB);
      expect(parsed.intent).toBe('search_resources');
    });

    test('Extracts seminar hall type, date, and morning time window', () => {
      const parsed = parseNaturalLanguageQuery('Is there a seminar hall for 100 people available on 2026-11-20 morning?');
      expect(parsed.extractedParams.minCapacity).toBe(100);
      expect(parsed.extractedParams.resourceType).toBe(RESOURCE_TYPES.SEMINAR_HALL);
      expect(parsed.extractedParams.preferredDate).toBe('2026-11-20');
      expect(parsed.extractedParams.timeWindow?.name).toBe('morning');
      expect(parsed.intent).toBe('check_availability');
    });

    test('Extracts equipment category for projector and microphone requests', () => {
      const parsed = parseNaturalLanguageQuery('Need a 4K projector and wireless microphone for keynote');
      expect(parsed.extractedParams.resourceType).toBe(RESOURCE_TYPES.EQUIPMENT);
      expect(parsed.extractedParams.keywords).toContain('projector');
      expect(parsed.extractedParams.keywords).toContain('microphone');
    });

    test('Extracts auditorium category and afternoon time window', () => {
      const parsed = parseNaturalLanguageQuery('Auditorium needed for 300 attendees tomorrow afternoon');
      expect(parsed.extractedParams.resourceType).toBe(RESOURCE_TYPES.AUDITORIUM);
      expect(parsed.extractedParams.minCapacity).toBe(300);
      expect(parsed.extractedParams.timeWindow?.name).toBe('afternoon');
    });

    test('Classifies FAQ intent for policy inquiry', () => {
      const parsed = parseNaturalLanguageQuery('How do I cancel a pending reservation or approve a booking?');
      expect(parsed.intent).toBe('faq');
    });

    test('Handles out-of-scope query as general intent without errors', () => {
      const parsed = parseNaturalLanguageQuery('What is the weather outside?');
      expect(parsed.intent).toBe('general');
    });
  });

  describe('2. Query Processing & Structured Recommendations', () => {
    const mockResourceId = new mongoose.Types.ObjectId().toString();
    const mockLab = {
      _id: mockResourceId,
      name: 'Alan Turing Computer Lab',
      type: RESOURCE_TYPES.LAB,
      capacity: 45,
      location: {
        building: 'Turing Block',
        floor: 2,
        roomNumber: 'LAB-201',
      },
      amenities: ['Workstations', 'High-Speed Internet'],
      status: RESOURCE_STATUS.AVAILABLE,
      isActive: true,
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Returns structured FAQ response for policy query', async () => {
      const res = await processAiQuery('How to cancel my reservation?');
      expect(res.intent).toBe('faq');
      expect(res.naturalLanguageResponse).toContain('Academic Booking Portal FAQ');
      expect(Array.isArray(res.suggestedActions)).toBe(true);
      expect(res.suggestedActions.length).toBeGreaterThan(0);
    });

    test('Finds matching lab, cross-references availability, and generates PREFILL_BOOKING action chips', async () => {
      jest.spyOn(Resource, 'find').mockReturnValueOnce({
        limit: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([mockLab]),
        }),
      });

      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockLab),
      });

      jest.spyOn(Booking, 'find').mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }));

      const res = await processAiQuery('Find a lab with 30 computers for 2026-11-20 morning');

      expect(res.suggestedResources).toHaveLength(1);
      expect(res.suggestedResources[0].name).toBe('Alan Turing Computer Lab');
      expect(res.suggestedSlots.length).toBeGreaterThan(0);
      expect(res.naturalLanguageResponse).toContain('Alan Turing Computer Lab');

      // Assert PREFILL_BOOKING action is present
      const prefillAction = res.suggestedActions.find((a) => a.action === 'PREFILL_BOOKING');
      expect(prefillAction).toBeDefined();
      expect(prefillAction.payload.resourceId).toBe(mockResourceId);
      expect(prefillAction.payload.date).toBe('2026-11-20');
    });

    test('Gracefully returns guidance when no resources match criteria', async () => {
      jest.spyOn(Resource, 'find').mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await processAiQuery('Looking for an auditorium for 5000 attendees');
      expect(res.suggestedResources).toHaveLength(0);
      expect(res.naturalLanguageResponse).toContain("couldn't find any available facilities");
    });
  });
});
