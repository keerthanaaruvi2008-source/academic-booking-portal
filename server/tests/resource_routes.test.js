import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import { generateAccessToken } from '../src/services/authService.js';
import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Admin Resource Management: Routes & RBAC Verification', () => {
  const studentUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Student User',
    email: 'student@university.edu',
    role: ROLES.STUDENT,
    isActive: true,
  };

  const facultyUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Faculty User',
    email: 'faculty@university.edu',
    role: ROLES.FACULTY,
    isActive: true,
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Admin User',
    email: 'admin@university.edu',
    role: ROLES.ADMIN,
    isActive: true,
  };

  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockResource = {
    _id: mockResourceId,
    name: 'Main Seminar Hall',
    type: RESOURCE_TYPES.SEMINAR_HALL,
    capacity: 120,
    location: {
      building: 'Auditorium Block',
      floor: 1,
      roomNumber: 'SH-01',
    },
    amenities: ['Projector', 'Air Conditioning'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
    createdBy: adminUser._id,
  };

  const studentToken = generateAccessToken(studentUser);
  const facultyToken = generateAccessToken(facultyUser);
  const adminToken = generateAccessToken(adminUser);

  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (query._id === studentUser._id) return Promise.resolve(studentUser);
      if (query._id === facultyUser._id) return Promise.resolve(facultyUser);
      if (query._id === adminUser._id) return Promise.resolve(adminUser);
      return Promise.resolve(null);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/resources (List Resources)', () => {
    test('Rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/resources');
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Allows authenticated student to list resources with pagination', async () => {
      jest.spyOn(Resource, 'countDocuments').mockResolvedValueOnce(1);
      jest.spyOn(Resource, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          sort: jest.fn().mockReturnValueOnce({
            skip: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce([mockResource]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/v1/resources')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resources).toHaveLength(1);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/resources/:id (Get Resource Details)', () => {
    test('Allows authenticated student to fetch resource details', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockResource),
      });

      const res = await request(app)
        .get(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource._id).toBe(mockResourceId);
    });
  });

  describe('POST /api/v1/resources (Create Resource - Admin Only)', () => {
    const newResourceData = {
      name: 'Smart Classroom 101',
      type: RESOURCE_TYPES.CLASSROOM,
      capacity: 40,
      location: {
        building: 'Science Block',
        floor: 1,
        roomNumber: 'SC-101',
      },
    };

    test('Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .send(newResourceData);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects creation by student with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(newResourceData);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('Rejects creation by faculty with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send(newResourceData);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('Allows creation by admin with 201 Created', async () => {
      jest.spyOn(Resource, 'create').mockResolvedValueOnce({ _id: mockResourceId });
      jest.spyOn(Resource, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          ...newResourceData,
          _id: mockResourceId,
          createdBy: adminUser._id,
        }),
      });

      const res = await request(app)
        .post('/api/v1/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newResourceData);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource.name).toBe(newResourceData.name);
    });
  });

  describe('PUT /api/v1/resources/:id (Update Resource - Admin Only)', () => {
    test('Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .put(`/api/v1/resources/${mockResourceId}`)
        .send({ capacity: 50 });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects update by student with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ capacity: 50 });

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Allows update by admin with 200 OK', async () => {
      jest.spyOn(Resource, 'findOneAndUpdate').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          ...mockResource,
          capacity: 150,
        }),
      });

      const res = await request(app)
        .put(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ capacity: 150 });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resource.capacity).toBe(150);
    });
  });

  describe('DELETE /api/v1/resources/:id (Delete Resource - Admin Only)', () => {
    test('Rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .delete(`/api/v1/resources/${mockResourceId}`);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    test('Rejects delete by student with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Rejects delete by faculty with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    test('Allows soft-delete by admin with 200 OK', async () => {
      jest.spyOn(Resource, 'findOneAndUpdate').mockResolvedValueOnce({
        _id: mockResourceId,
        isActive: false,
      });

      const res = await request(app)
        .delete(`/api/v1/resources/${mockResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('deactivated successfully');
    });
  });
});
