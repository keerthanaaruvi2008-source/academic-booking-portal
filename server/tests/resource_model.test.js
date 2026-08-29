import Resource from '../src/models/Resource.js';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LIST,
  RESOURCE_STATUS,
  RESOURCE_STATUS_LIST,
} from '../src/config/constants.js';
import mongoose from 'mongoose';

describe('Step 2.1: Resource Model Verification', () => {
  const validCreatorId = new mongoose.Types.ObjectId();

  const validResourceData = {
    name: 'Turing Computer Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 45,
    location: {
      building: 'Engineering Block A',
      floor: 2,
      roomNumber: 'LAB-204',
    },
    amenities: ['High-Performance PCs', 'Projector', 'Air Conditioning', 'Gigabit Ethernet'],
    status: RESOURCE_STATUS.AVAILABLE,
    createdBy: validCreatorId,
  };

  describe('Schema Validation & Defaults', () => {
    test('Applies default values for type, status, capacity, and isActive', () => {
      const resource = new Resource({
        name: 'Basic Seminar Room',
        location: {
          building: 'Main Block',
          roomNumber: '101',
        },
        createdBy: validCreatorId,
      });

      expect(resource.type).toBe(RESOURCE_TYPES.CLASSROOM);
      expect(resource.status).toBe(RESOURCE_STATUS.AVAILABLE);
      expect(resource.capacity).toBe(30);
      expect(resource.isActive).toBe(true);
      expect(resource.amenities).toEqual([]);
      expect(resource.location.floor).toBe(1);
    });

    test('Passes validation with complete valid resource data', () => {
      const resource = new Resource(validResourceData);
      const err = resource.validateSync();
      expect(err).toBeUndefined();
    });

    test('Fails validation when required fields are missing', () => {
      const emptyResource = new Resource({});
      const emptyErr = emptyResource.validateSync();

      expect(emptyErr.errors.name).toBeDefined();
      expect(emptyErr.errors.location).toBeDefined();
      expect(emptyErr.errors.createdBy).toBeDefined();

      const missingSubfieldsResource = new Resource({
        name: 'Room',
        location: {},
        createdBy: validCreatorId,
      });
      const subfieldErr = missingSubfieldsResource.validateSync();

      expect(subfieldErr.errors['location.building']).toBeDefined();
      expect(subfieldErr.errors['location.roomNumber']).toBeDefined();
    });

    test('Fails validation when capacity is less than 1', () => {
      const resource = new Resource({
        ...validResourceData,
        capacity: 0,
      });

      const err = resource.validateSync();
      expect(err.errors.capacity).toBeDefined();
      expect(err.errors.capacity.message).toContain('at least 1');
    });
  });

  describe('Enum Constraints', () => {
    test('Accepts all valid resource types from RESOURCE_TYPE_LIST', () => {
      RESOURCE_TYPE_LIST.forEach((validType) => {
        const resource = new Resource({
          ...validResourceData,
          type: validType,
        });
        const err = resource.validateSync();
        expect(err).toBeUndefined();
      });
    });

    test('Rejects invalid resource type', () => {
      const resource = new Resource({
        ...validResourceData,
        type: 'cafeteria_hall',
      });

      const err = resource.validateSync();
      expect(err.errors.type).toBeDefined();
      expect(err.errors.type.message).toContain('not supported');
    });

    test('Accepts all valid resource statuses from RESOURCE_STATUS_LIST', () => {
      RESOURCE_STATUS_LIST.forEach((validStatus) => {
        const resource = new Resource({
          ...validResourceData,
          status: validStatus,
        });
        const err = resource.validateSync();
        expect(err).toBeUndefined();
      });
    });

    test('Rejects invalid resource status', () => {
      const resource = new Resource({
        ...validResourceData,
        status: 'under_demolition',
      });

      const err = resource.validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });
});
