/**
 * @fileoverview AI Assistant HTTP Controller.
 * Dispatches natural language queries to the AI domain service and formats responses.
 */

import { processAiQuery } from '../services/aiService.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Handles natural language advisor queries.
 * POST /api/v1/ai/query
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleQuery = async (req, res, next) => {
  try {
    const result = await processAiQuery(req.body.prompt, req.user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
