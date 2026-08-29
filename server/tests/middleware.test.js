import { jest } from '@jest/globals';
import authenticate from '../src/middleware/auth.js';
import requireRole from '../src/middleware/rbac.js';
import errorHandler from '../src/middleware/errorHandler.js';
import { ROLES, HTTP_STATUS } from '../src/config/constants.js';
import { generateAccessToken } from '../src/services/authService.js';
import User from '../src/models/User.js';
import AppError from '../src/utils/appError.js';

describe('Step 1.5: Middleware Verification (Auth, RBAC, ErrorHandler)', () => {
  describe('Authentication Middleware (auth.js)', () => {
    test('Rejects request with no Authorization header (401)', async () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('Rejects request with non-Bearer Authorization header (401)', async () => {
      const req = { headers: { authorization: 'Basic 12345' } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('Rejects request with invalid JWT (401)', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token' } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('Attaches req.user and proceeds when token is valid and user exists', async () => {
      const mockUser = {
        _id: '60d0fe4f5311236168a109ca',
        name: 'Faculty User',
        email: 'faculty@university.edu',
        role: ROLES.FACULTY,
        isActive: true,
      };

      const token = generateAccessToken(mockUser);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      // Mock User.findOne
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();

      User.findOne.mockRestore();
    });

    test('Rejects when token is valid but user no longer exists or is deactivated (401)', async () => {
      const mockUser = {
        _id: '60d0fe4f5311236168a109ca',
        email: 'deleted@university.edu',
        role: ROLES.STUDENT,
      };

      const token = generateAccessToken(mockUser);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.code).toBe('USER_DEACTIVATED_OR_NOT_FOUND');

      User.findOne.mockRestore();
    });
  });

  describe('RBAC Middleware (rbac.js)', () => {
    test('Rejects unauthenticated request (401)', () => {
      const guard = requireRole([ROLES.ADMIN]);
      const req = {};
      const res = {};
      const next = jest.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('Allows access when user role matches allowed roles', () => {
      const guard = requireRole([ROLES.ADMIN, ROLES.FACULTY]);
      const req = { user: { role: ROLES.FACULTY } };
      const res = {};
      const next = jest.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('Blocks access with 403 Forbidden when user role is not authorized', () => {
      const guard = requireRole([ROLES.ADMIN]);
      const req = { user: { role: ROLES.STUDENT } };
      const res = {};
      const next = jest.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Centralized Error Handler (errorHandler.js)', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('Formats AppError properly', () => {
      const err = new AppError('Custom conflict message', HTTP_STATUS.CONFLICT, 'CUSTOM_CONFLICT');
      const req = { method: 'POST', originalUrl: '/api/v1/test' };
      const res = mockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Custom conflict message',
            code: 'CUSTOM_CONFLICT',
          }),
        })
      );
    });

    test('Formats MongoDB duplicate key error (11000) as 409 Conflict', () => {
      const err = { code: 11000, keyValue: { email: 'test@example.com' } };
      const req = { method: 'POST', originalUrl: '/api/v1/auth/register' };
      const res = mockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DUPLICATE_RESOURCE',
            message: expect.stringContaining('email'),
          }),
        })
      );
    });

    test('Formats Mongoose ValidationError as 400 Bad Request', () => {
      const err = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
          email: { message: 'Email is required' },
        },
      };
      const req = { method: 'POST', originalUrl: '/api/v1/test' };
      const res = mockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Name is required, Email is required',
          }),
        })
      );
    });
  });
});
