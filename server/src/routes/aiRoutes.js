/**
 * @fileoverview AI Assistant routes.
 * Exposes authenticated natural language query processing endpoints with Zod validation.
 */

import { Router } from 'express';
import { handleQuery } from '../controllers/aiController.js';
import authenticate from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { aiQuerySchema } from '../validations/aiValidation.js';

const router = Router();

// Process natural language advisor queries (Authenticated users)
router.post('/query', authenticate, validate(aiQuerySchema, 'body'), handleQuery);

export default router;
