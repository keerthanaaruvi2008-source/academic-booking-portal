import { jest } from '@jest/globals';
import * as resourceService from '../src/services/resourceService.js';
import Resource from '../src/models/Resource.js';
import { RESOURCE_TYPES, RESOURCE_STATUS, HTTP_STATUS } from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.2: Resource Service Verification', () => {
  const mockCreatorId = new mongoose.Types.ObjectId().toString();
  const mockResourceId = new mongoose.Types.ObjectId().toString();

  const mockResource = {
    _id: mockResourceId,
    name: 'Ada Lovelace Auditorium',
    type: RESOURCE_TYPES.AUDITORIUM,
    capacity: 250,
    location: {
      building: 'Main Academic Complex',
      floor: 1,
      roomNumber: 'AUD-01',
    },
    amenities: ['4K Projector', 'Surround Sound', 'Stage Lighting', 'Microphones'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
    createdBy: {
      _id: mockCreatorId,
      name: 'Admin User',
      email: 'admin@university.edu',
      role: 'admin',
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createResource', () => {
    test('Rejects creation when creatorId is missing', async () => {
      await expect(resourceService.createResource({ name: 'Test' }, null)).rejects.toThrow(
        'Creator ID is required'
      );
    });

    test('Successfully creates resource and populates creator', async () => {
      jest.spyOn(Resource, 'create').mockResolvedValueOnce({ _id: mockResourceId });
      jest.spyOn(Resource, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockResource),
      });

      const result = await resourceService.createResource(
        {
          name: mockResource.name,
          type: mockResource.type,
          capacity: mockResource.capacity,
          location: mockResource.location,
        },
        mockCreatorId
      );

      expect(result).toEqual(mockResource);
      expect(Resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockResource.name,
          createdBy: mockCreatorId,
        })
      );
    });
  });

  describe('getResourceById', () => {
    test('Rejects invalid ObjectId format with 400', async () => {
      await expect(resourceService.getResourceById('invalid-id')).rejects.toThrow(
        'Invalid resource identifier format.'
      );
    });

    test('Throws 404 when resource does not exist or is inactive', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(resourceService.getResourceById(mockResourceId)).rejects.toThrow(
        'Resource not found or has been deactivated.'
      );
    });

    test('Returns active resource when found', async () => {
      jest.spyOn(Resource, 'findOne').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(mockResource),
      });

      const result = await resourceService.getResourceById(mockResourceId);
      expect(result).toEqual(mockResource);
    });
  });

  describe('listResources', () => {
    test('Applies pagination defaults and returns resources list', async () => {
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

      const result = await resourceService.listResources({ page: 1, limit: 10 });

      expect(result.resources).toHaveLength(1);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    test('Constructs filter query for type, status, and minCapacity', async () => {
      jest.spyOn(Resource, 'countDocuments').mockResolvedValueOnce(0);
      const findSpy = jest.spyOn(Resource, 'find').mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          sort: jest.fn().mockReturnValueOnce({
            skip: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      });

      await resourceService.listResources({
        type: RESOURCE_TYPES.LAB,
        status: RESOURCE_STATUS.AVAILABLE,
        minCapacity: 50,
      });

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          type: RESOURCE_TYPES.LAB,
          status: RESOURCE_STATUS.AVAILABLE,
          capacity: { $gte: 50 },
        })
      );
    });
  });

  describe('updateResource', () => {
    test('Rejects invalid ObjectId format with 400', async () => {
      await expect(resourceService.updateResource('bad-id', { capacity: 60 })).rejects.toThrow(
        'Invalid resource identifier format.'
      );
    });

    test('Throws 404 if resource does not exist', async () => {
      jest.spyOn(Resource, 'findOneAndUpdate').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(resourceService.updateResource(mockResourceId, { capacity: 60 })).rejects.toThrow(
        'Resource not found or has been deactivated.'
      );
    });

    test('Successfully updates allowed fields', async () => {
      const updatedResource = { ...mockResource, capacity: 300 };
      jest.spyOn(Resource, 'findOneAndUpdate').mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(updatedResource),
      });

      const result = await resourceService.updateResource(mockResourceId, {
        capacity: 300,
        createdBy: 'attempt_override',
      });

      expect(result.capacity).toBe(300);
      expect(Resource.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockResourceId, isActive: true },
        { capacity: 300 },
        expect.objectContaining({ new: true, runValidators: true })
      );
    });
  });

  describe('deleteResource (Soft-Delete)', () => {
    test('Soft-deletes resource by setting isActive to false', async () => {
      jest.spyOn(Resource, 'findOneAndUpdate').mockResolvedValueOnce({
        _id: mockResourceId,
        isActive: false,
      });

      const result = await resourceService.deleteResource(mockResourceId);

      expect(result.message).toContain('deactivated successfully');
      expect(result.id).toBe(mockResourceId);
      expect(Resource.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockResourceId, isActive: true },
        { isActive: false },
        { new: true }
      );
    });

    test('Throws 404 when attempting to delete non-existent resource', async () => {
      jest.spyOn(Resource, 'findOneAndUpdate').mockResolvedValueOnce(null);

      await expect(resourceService.deleteResource(mockResourceId)).rejects.toThrow(
        'Resource not found or already deactivated.'
      );
    });
  });
});
