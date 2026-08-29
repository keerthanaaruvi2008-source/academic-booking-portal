import { aiQuerySchema, aiStructuredOutputSchema } from '../src/validations/aiValidation.js';

describe('Step 4.2: AI Validation Schemas Verification', () => {
  describe('aiQuerySchema', () => {
    test('Passes with valid natural language query', () => {
      const result = aiQuerySchema.safeParse({
        prompt: 'Find a computer lab with at least 30 PCs for tomorrow morning',
      });
      expect(result.success).toBe(true);
      expect(result.data.prompt).toContain('computer lab');
    });

    test('Fails when prompt is missing or not a string', () => {
      const result = aiQuerySchema.safeParse({});
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Prompt string is required');
    });

    test('Fails when prompt is too short (< 2 characters)', () => {
      const result = aiQuerySchema.safeParse({ prompt: 'A' });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('at least 2 characters');
    });

    test('Fails when prompt exceeds 1000 characters', () => {
      const result = aiQuerySchema.safeParse({ prompt: 'A'.repeat(1001) });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('cannot exceed 1000 characters');
    });
  });

  describe('aiStructuredOutputSchema', () => {
    const validOutput = {
      intent: 'search_resources',
      extractedParams: {
        minCapacity: 40,
        resourceType: 'lab',
        preferredDate: '2026-11-20',
        timeWindow: {
          name: 'morning',
          startHour: 8,
          endHour: 12,
        },
        keywords: ['lab', 'computer'],
      },
      suggestedResources: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Alan Turing Lab',
        },
      ],
      suggestedSlots: [
        {
          resourceId: '507f1f77bcf86cd799439011',
          resourceName: 'Alan Turing Lab',
          startTime: '2026-11-20T09:00:00.000Z',
          endTime: '2026-11-20T10:00:00.000Z',
        },
      ],
      naturalLanguageResponse: 'Here are the available facilities...',
      suggestedActions: [
        {
          label: 'Book Turing Lab at 09:00 UTC',
          action: 'PREFILL_BOOKING',
          payload: {
            resourceId: '507f1f77bcf86cd799439011',
          },
        },
      ],
    };

    test('Passes with valid structured output envelope', () => {
      const result = aiStructuredOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    test('Fails on invalid intent enum', () => {
      const result = aiStructuredOutputSchema.safeParse({
        ...validOutput,
        intent: 'invalid_intent',
      });
      expect(result.success).toBe(false);
    });

    test('Fails on malformed suggestedSlot object (missing start/endTime)', () => {
      const result = aiStructuredOutputSchema.safeParse({
        ...validOutput,
        suggestedSlots: [
          {
            resourceName: 'Lab',
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
