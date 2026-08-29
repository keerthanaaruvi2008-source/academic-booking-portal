/**
 * @fileoverview Zod validation schemas for AI Assistant query requests and structured outputs.
 */

import { z } from 'zod';

/**
 * Validation schema for inbound natural language AI queries.
 */
export const aiQuerySchema = z.object({
  prompt: z
    .string({ required_error: 'Prompt string is required.' })
    .trim()
    .min(2, 'Query must be at least 2 characters long.')
    .max(1000, 'Query cannot exceed 1000 characters.'),
});

/**
 * Validation schema enforcing structured AI response output envelope.
 */
export const aiStructuredOutputSchema = z.object({
  intent: z.enum(['search_resources', 'check_availability', 'suggest_slot', 'faq', 'general']),
  extractedParams: z.object({
    minCapacity: z.number().nullable().optional(),
    resourceType: z.string().nullable().optional(),
    preferredDate: z.string().nullable().optional(),
    timeWindow: z
      .object({
        name: z.string(),
        startHour: z.number(),
        endHour: z.number(),
      })
      .nullable()
      .optional(),
    keywords: z.array(z.string()).optional(),
  }),
  suggestedResources: z.array(z.any()),
  suggestedSlots: z.array(
    z.object({
      resourceId: z.any(),
      resourceName: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
  naturalLanguageResponse: z.string(),
  suggestedActions: z.array(
    z.object({
      label: z.string(),
      action: z.string(),
      payload: z.record(z.any()).optional(),
    })
  ),
});
