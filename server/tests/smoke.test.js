/**
 * @fileoverview Phase 1 End-to-End Smoke Test.
 * Validates the full authentication lifecycle: registration, login, role-protected profile access,
 * unauthenticated rejection, and RBAC role authorization.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { ROLES, HTTP_STATUS } from '../src/config/constants.js';
import bcrypt from 'bcryptjs';

describe('Step 1.8: Phase 1 Authentication & RBAC Smoke Test', () => {
  const studentUserData = {
    name: 'Alex Student',
    email: 'alex.student@university.edu',
    password: 'SecurePassword123!',
    role: ROLES.STUDENT,
    department: 'Computer Science',
  };

  const adminUserData = {
    name: 'Prof. Admin',
    email: 'admin@university.edu',
    password: 'AdminPassword123!',
    role: ROLES.ADMIN,
    department: 'Administration',
  };

  let studentAccessToken = '';
  let adminAccessToken = '';

  // In-memory mock user store for end-to-end simulation
  const mockDb = new Map();

  beforeAll(async () => {
    // Mock User Mongoose methods to back tests with an in-memory repository
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query.email) {
        const found = mockDb.get(query.email.toLowerCase());
        return Promise.resolve(found || null);
      }
      if (query._id) {
        for (const user of mockDb.values()) {
          if (user._id === query._id && (query.isActive === undefined || user.isActive === query.isActive)) {
            return Promise.resolve(user);
          }
        }
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    jest.spyOn(User, 'create').mockImplementation(async (data) => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.passwordHash, salt);

      const createdUser = {
        _id: 'mock_id_' + Date.now() + Math.random().toString(36).substring(2, 7),
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role || ROLES.STUDENT,
        department: data.department || '',
        isActive: true,
        comparePassword: async function (candidatePassword) {
          return bcrypt.compare(candidatePassword, this.passwordHash);
        },
        toJSON: function () {
          const copy = { ...this };
          delete copy.passwordHash;
          delete copy.__v;
          delete copy.comparePassword;
          delete copy.toJSON;
          return copy;
        },
      };

      mockDb.set(createdUser.email, createdUser);
      return createdUser;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Registration Flow', () => {
    test('Successfully registers a student user and receives JWT (POST /api/v1/auth/register)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(studentUserData);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(studentUserData.email.toLowerCase());
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(typeof res.body.data.accessToken).toBe('string');

      // Refresh cookie verification
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    test('Successfully registers an admin user (POST /api/v1/auth/register)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(adminUserData);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.ADMIN);
    });

    test('Rejects duplicate registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(studentUserData);

      expect(res.status).toBe(HTTP_STATUS.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('2. Login Flow', () => {
    test('Successfully logs in student and retrieves access token (POST /api/v1/auth/login)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: studentUserData.email,
          password: studentUserData.password,
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(typeof res.body.data.accessToken).toBe('string');

      studentAccessToken = res.body.data.accessToken;
    });

    test('Successfully logs in admin and retrieves access token (POST /api/v1/auth/login)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: adminUserData.email,
          password: adminUserData.password,
        });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.ADMIN);

      adminAccessToken = res.body.data.accessToken;
    });

    test('Rejects invalid password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: studentUserData.email,
          password: 'IncorrectPassword!',
        });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('3. Protected Route Access (/api/v1/users/me)', () => {
    test('Authenticated student gets 200 OK and profile data', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(studentUserData.email.toLowerCase());
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
    });

    test('Unauthenticated request gets 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('Request with malformed token gets 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer bad.token.here');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. RBAC Role-Guarded Route Access (/api/v1/users/admin-check)', () => {
    test('Student receives 403 Forbidden on admin-only route', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin-check')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(res.body.error.message).toContain('student');
    });

    test('Admin receives 200 OK on admin-only route', async () => {
      const res = await request(app)
        .get('/api/v1/users/admin-check')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Admin access verified');
    });
  });
});
