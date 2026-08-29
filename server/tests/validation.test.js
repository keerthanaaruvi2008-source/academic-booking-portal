import request from 'supertest';
import app from '../src/app.js';
import { registerSchema, loginSchema } from '../src/validations/authValidation.js';
import { ROLES } from '../src/config/constants.js';

describe('Step 1.6: Validation Layer Verification (Zod Schemas & Middleware)', () => {
  describe('Zod Schema Unit Tests', () => {
    describe('registerSchema', () => {
      test('Rejects missing or too short name', () => {
        const result = registerSchema.safeParse({
          name: 'A',
          email: 'test@university.edu',
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('at least 2 characters');
      });

      test('Rejects invalid email format', () => {
        const result = registerSchema.safeParse({
          name: 'Valid Name',
          email: 'not-an-email',
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('valid email address');
      });

      test('Rejects password shorter than 8 characters', () => {
        const result = registerSchema.safeParse({
          name: 'Valid Name',
          email: 'test@university.edu',
          password: '123',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('at least 8 characters');
      });

      test('Rejects invalid role value', () => {
        const result = registerSchema.safeParse({
          name: 'Valid Name',
          email: 'test@university.edu',
          password: 'Password123!',
          role: 'superadmin',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('Role must be one of');
      });

      test('Accepts valid payload, trims, lowercases email, and applies default role', () => {
        const result = registerSchema.safeParse({
          name: '  Jane Doe  ',
          email: '  JANE@University.EDU  ',
          password: 'SecurePassword123!',
        });
        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Jane Doe');
        expect(result.data.email).toBe('jane@university.edu');
        expect(result.data.role).toBe(ROLES.STUDENT);
        expect(result.data.department).toBe('');
      });
    });

    describe('loginSchema', () => {
      test('Rejects missing or invalid email', () => {
        const result = loginSchema.safeParse({
          email: 'invalid-email',
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('valid email address');
      });

      test('Rejects empty password', () => {
        const result = loginSchema.safeParse({
          email: 'valid@university.edu',
          password: '',
        });
        expect(result.success).toBe(false);
        expect(result.error.errors[0].message).toContain('Password is required');
      });

      test('Accepts valid credentials and normalizes email', () => {
        const result = loginSchema.safeParse({
          email: '  USER@UNIVERSITY.EDU  ',
          password: 'MyPassword',
        });
        expect(result.success).toBe(true);
        expect(result.data.email).toBe('user@university.edu');
      });
    });
  });

  describe('Route Boundary Validation Middleware via HTTP', () => {
    test('POST /api/v1/auth/register fails with 400 and VALIDATION_ERROR on bad payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'A',
          email: 'bad-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('name');
      expect(res.body.error.message).toContain('email');
      expect(res.body.error.message).toContain('password');
    });

    test('POST /api/v1/auth/login fails with 400 and VALIDATION_ERROR on malformed email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-valid-email',
          password: 'validpassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('valid email address');
    });
  });
});
