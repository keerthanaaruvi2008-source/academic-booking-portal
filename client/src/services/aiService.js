/**
 * @fileoverview AI Assistant API service wrappers for frontend components.
 * Interfaces with the /api/v1/ai endpoints via the centralized Axios client.
 */

import api from './api.js';

/**
 * Dispatches a natural language search or recommendation query to the AI Advisor.
 *
 * @param {string} prompt - User's plain text query string.
 * @returns {Promise<{
 *   success: boolean,
 *   data: {
 *     intent: string,
 *     extractedParams: object,
 *     suggestedResources: object[],
 *     suggestedSlots: object[],
 *     naturalLanguageResponse: string,
 *     suggestedActions: object[]
 *   }
 * }>}
 */
export const queryAiAssistant = async (prompt) => {
  return api.post('/ai/query', { prompt });
};
