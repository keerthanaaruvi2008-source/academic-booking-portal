import User from '../src/models/User.js';
import { ROLES, ROLE_LIST } from '../src/config/constants.js';
import bcrypt from 'bcryptjs';

describe('Step 1.3: User Model Verification', () => {
  describe('Schema Validation & Defaults', () => {
    test('User has default role of student and isActive true', () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@university.edu',
        passwordHash: 'dummyHash123',
      });

      expect(user.role).toBe(ROLES.STUDENT);
      expect(user.isActive).toBe(true);
      expect(user.department).toBe('');
    });

    test('User validation fails when required fields are missing', () => {
      const user = new User({});
      const err = user.validateSync();

      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.passwordHash).toBeDefined();
    });

    test('User validation fails for invalid email format', () => {
      const user = new User({
        name: 'John Doe',
        email: 'not-a-valid-email',
        passwordHash: 'dummyHash123',
      });

      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    test('User validation accepts valid roles and rejects unsupported roles', () => {
      ROLE_LIST.forEach((validRole) => {
        const validUser = new User({
          name: 'Valid User',
          email: `${validRole}@university.edu`,
          passwordHash: 'dummyHash123',
          role: validRole,
        });
        const err = validUser.validateSync();
        expect(err).toBeUndefined();
      });

      const invalidUser = new User({
        name: 'Invalid Role User',
        email: 'invalid@university.edu',
        passwordHash: 'dummyHash123',
        role: 'superadmin',
      });
      const err = invalidUser.validateSync();
      expect(err.errors.role).toBeDefined();
    });
  });

  describe('Password Hashing & Comparison', () => {
    test('comparePassword returns true for matching password and false otherwise', async () => {
      const plainPassword = 'SuperSecretPassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainPassword, salt);

      const user = new User({
        name: 'Jane Smith',
        email: 'jane@university.edu',
        passwordHash: hash,
        role: ROLES.FACULTY,
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isWrong = await user.comparePassword('WrongPassword');
      expect(isWrong).toBe(false);
    });

    test('User.hashPassword static method hashes password correctly', async () => {
      const plainPassword = 'TestPassword123!';
      const hash = await User.hashPassword(plainPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(plainPassword);
      expect(await bcrypt.compare(plainPassword, hash)).toBe(true);
    });
  });

  describe('JSON Serialization & Sanitization', () => {
    test('toJSON removes passwordHash and __v', () => {
      const user = new User({
        name: 'Alice Admin',
        email: 'alice@university.edu',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        role: ROLES.ADMIN,
        department: 'Computer Science',
      });

      const json = user.toJSON();

      expect(json.name).toBe('Alice Admin');
      expect(json.email).toBe('alice@university.edu');
      expect(json.role).toBe('admin');
      expect(json.department).toBe('Computer Science');
      expect(json.passwordHash).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });
});
