import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  registerUser,
  loginUser,
  refreshTokens,
} from '../src/services/authService.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/config/constants.js';
import jwt from 'jsonwebtoken';

describe('Step 1.4: Auth Service & Controller Verification', () => {
  const mockUser = {
    _id: '60d0fe4f5311236168a109ca',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    comparePassword: jest.fn(),
  };

  describe('JWT Token Generation & Verification', () => {
    test('generateAccessToken returns valid signed JWT with expected payload', () => {
      const token = generateAccessToken(mockUser);
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    test('generateRefreshToken returns valid signed refresh JWT', () => {
      const refreshToken = generateRefreshToken(mockUser);
      expect(typeof refreshToken).toBe('string');

      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.id).toBe(mockUser._id);
    });

    test('verifyAccessToken throws for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.signature')).toThrow('Invalid access token');
    });

    test('verifyRefreshToken throws for invalid token', () => {
      expect(() => verifyRefreshToken('invalid.refresh.signature')).toThrow('Invalid refresh token');
    });

    test('verifyAccessToken throws for expired token', () => {
      const expiredToken = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secret_key_12345',
        { expiresIn: '-1s' }
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow('Access token has expired');
    });
  });

  describe('Auth Service Error Handling', () => {
    test('registerUser rejects missing mandatory fields', async () => {
      await expect(registerUser({ name: '', email: '', password: '' })).rejects.toThrow(
        'Name, email, and password are required'
      );
    });

    test('loginUser rejects missing email or password', async () => {
      await expect(loginUser({ email: '', password: '' })).rejects.toThrow(
        'Email and password are required'
      );
    });

    test('refreshTokens rejects missing refresh token', async () => {
      await expect(refreshTokens(null)).rejects.toThrow('Refresh token is required');
    });
  });

  describe('Auth Controller Route Endpoints', () => {
    test('POST /api/v1/auth/register fails with 400 when body is empty', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/v1/auth/login fails with 400 when body is empty', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/v1/auth/logout clears refresh cookie and returns 200', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Logged out successfully');

      // Assert cookie is cleared
      const cookieHeader = res.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toContain('refreshToken=;');
    });
  });
});
