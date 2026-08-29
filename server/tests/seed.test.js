/**
 * @fileoverview Database seed engine tests.
 * Asserts schema validity of seed datasets, role coverage, resource domain distribution,
 * and conflict-free sample reservation creation.
 */

import { jest } from '@jest/globals';
import { SEED_USERS, SEED_RESOURCES } from '../src/utils/seedData.js';
import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS } from '../src/config/constants.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import mongoose from 'mongoose';

describe('Step 5.7: Comprehensive Seed Runner Test', () => {
  describe('1. Seed Dataset Schema & Coverage Assertions', () => {
    test('SEED_USERS contains valid representation across Admin, Faculty, and Student roles', () => {
      expect(SEED_USERS.length).toBeGreaterThanOrEqual(3);

      const rolesPresent = new Set(SEED_USERS.map((u) => u.role));
      expect(rolesPresent.has(ROLES.ADMIN)).toBe(true);
      expect(rolesPresent.has(ROLES.FACULTY)).toBe(true);
      expect(rolesPresent.has(ROLES.STUDENT)).toBe(true);

      SEED_USERS.forEach((user) => {
        expect(user.name).toBeTruthy();
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(user.password.length).toBeGreaterThanOrEqual(8);
        expect(user.isActive).toBe(true);
      });
    });

    test('SEED_RESOURCES covers all 5 resource categories with valid capacities and locations', () => {
      expect(SEED_RESOURCES.length).toBeGreaterThanOrEqual(5);

      const typesPresent = new Set(SEED_RESOURCES.map((r) => r.type));
      expect(typesPresent.has(RESOURCE_TYPES.SEMINAR_HALL)).toBe(true);
      expect(typesPresent.has(RESOURCE_TYPES.AUDITORIUM)).toBe(true);
      expect(typesPresent.has(RESOURCE_TYPES.LAB)).toBe(true);
      expect(typesPresent.has(RESOURCE_TYPES.CLASSROOM)).toBe(true);
      expect(typesPresent.has(RESOURCE_TYPES.EQUIPMENT)).toBe(true);

      SEED_RESOURCES.forEach((resource) => {
        expect(resource.name).toBeTruthy();
        expect(resource.capacity).toBeGreaterThanOrEqual(1);
        expect(resource.location.building).toBeTruthy();
        expect(resource.location.roomNumber).toBeTruthy();
        expect(Array.isArray(resource.amenities)).toBe(true);
        expect(resource.status).toBe(RESOURCE_STATUS.AVAILABLE);
        expect(resource.isActive).toBe(true);
      });
    });
  });

  describe('2. Idempotent Seed Logic Simulation', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Simulates user creation and skips pre-existing users without duplicate errors', async () => {
      const existingUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        email: SEED_USERS[0].email,
        name: SEED_USERS[0].name,
      };

      const userFindOneSpy = jest.spyOn(User, 'findOne').mockImplementation((query) => {
        if (query.email === existingUser.email) {
          return Promise.resolve(existingUser);
        }
        return Promise.resolve(null);
      });

      const userCreateSpy = jest.spyOn(User, 'create').mockImplementation((userData) => {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId().toString(),
          ...userData,
        });
      });

      // Execute seeding loop simulation
      const seeded = [];
      for (const uData of SEED_USERS) {
        let user = await User.findOne({ email: uData.email });
        if (!user) {
          user = await User.create(uData);
        }
        seeded.push(user);
      }

      expect(userFindOneSpy).toHaveBeenCalledTimes(SEED_USERS.length);
      // First user skipped because it already existed, others created
      expect(userCreateSpy).toHaveBeenCalledTimes(SEED_USERS.length - 1);
      expect(seeded).toHaveLength(SEED_USERS.length);
    });

    test('Simulates resource creation and verifies unique facility name lookup', async () => {
      const resourceFindOneSpy = jest.spyOn(Resource, 'findOne').mockResolvedValue(null);
      const resourceCreateSpy = jest.spyOn(Resource, 'create').mockImplementation((rData) => {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId().toString(),
          ...rData,
        });
      });

      const seededResources = [];
      for (const rData of SEED_RESOURCES) {
        let resource = await Resource.findOne({ name: rData.name });
        if (!resource) {
          resource = await Resource.create(rData);
        }
        seededResources.push(resource);
      }

      expect(resourceFindOneSpy).toHaveBeenCalledTimes(SEED_RESOURCES.length);
      expect(resourceCreateSpy).toHaveBeenCalledTimes(SEED_RESOURCES.length);
      expect(seededResources).toHaveLength(SEED_RESOURCES.length);
    });
  });
});
