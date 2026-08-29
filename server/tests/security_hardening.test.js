/**
 * @fileoverview Security hardening tests.
 * Asserts IP rate limiting, NoSQL operator injection sanitization, and Helmet HTTP security headers.
 */

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import { createRateLimiter, sanitizeNoSql } from '../src/middleware/rateLimiter.js';
import { HTTP_STATUS } from '../src/config/constants.js';

describe('Step 5.5: Security Hardening & Rate Limiting Verification', () => {
  describe('1. Rate Limiting Middleware', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      const customLimiter = createRateLimiter({
        windowMs: 5000,
        max: 3,
        message: 'Too many test requests.',
        code: 'TEST_RATE_LIMIT_EXCEEDED',
      });

      testApp.use('/rate-limited', customLimiter, (req, res) => {
        res.status(HTTP_STATUS.OK).json({ success: true });
      });
    });

    test('Allows requests under the limit and sets X-RateLimit headers', async () => {
      const res1 = await request(testApp).get('/rate-limited');
      expect(res1.status).toBe(HTTP_STATUS.OK);
      expect(res1.headers['x-ratelimit-limit']).toBe('3');
      expect(res1.headers['x-ratelimit-remaining']).toBe('2');

      const res2 = await request(testApp).get('/rate-limited');
      expect(res2.status).toBe(HTTP_STATUS.OK);
      expect(res2.headers['x-ratelimit-remaining']).toBe('1');
    });

    test('Blocks requests exceeding the limit with 429 and Retry-After header', async () => {
      await request(testApp).get('/rate-limited');
      await request(testApp).get('/rate-limited');
      await request(testApp).get('/rate-limited');

      const blockedRes = await request(testApp).get('/rate-limited');
      expect(blockedRes.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TEST_RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });

  describe('2. NoSQL Operator Injection Sanitizer', () => {
    let testApp;
    let capturedBody;
    let capturedQuery;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.use(sanitizeNoSql);

      testApp.post('/test-sanitize', (req, res) => {
        capturedBody = req.body;
        capturedQuery = req.query;
        res.status(HTTP_STATUS.OK).json({ success: true, body: req.body, query: req.query });
      });
    });

    test('Strips $ and . keys from request body to neutralize operator injection', async () => {
      const maliciousPayload = {
        email: 'user@university.edu',
        password: { $gt: '' },
        nested: {
          validField: 'allowed',
          $where: 'malicious JS code',
          'illegal.dotted.key': 123,
        },
      };

      const res = await request(testApp)
        .post('/test-sanitize?filter[$ne]=null&allowedParam=true')
        .send(maliciousPayload);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.body.email).toBe('user@university.edu');
      expect(res.body.body.password).toEqual({});
      expect(res.body.body.nested.validField).toBe('allowed');
      expect(res.body.body.nested.$where).toBeUndefined();
      expect(res.body.body.nested['illegal.dotted.key']).toBeUndefined();

      expect(res.body.query.allowedParam).toBe('true');
      expect(res.body.query['filter[$ne]']).toBeUndefined();
    });
  });

  describe('3. HTTP Security Headers (Helmet)', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(helmet());
      testApp.get('/secure-headers', (req, res) => {
        res.status(HTTP_STATUS.OK).json({ success: true });
      });
    });

    test('Sets standard security headers protecting against sniffing and clickjacking', async () => {
      const res = await request(testApp).get('/secure-headers');

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-download-options']).toBe('noopen');
    });
  });
});
