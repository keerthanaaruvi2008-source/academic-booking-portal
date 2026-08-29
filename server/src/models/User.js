/**
 * @fileoverview User Mongoose Schema and Model.
 * Represents system users (students, faculty, administrators) with secure password hashing,
 * role validation, and soft-delete support.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLE_LIST } from '../config/constants.js';

const SALT_WORK_FACTOR = 10;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/;

/**
 * User Schema definition.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ROLE_LIST,
        message: 'Role `{VALUE}` is not supported. Must be one of: ' + ROLE_LIST.join(', '),
      },
      default: ROLES.STUDENT,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save middleware: Hashes password if modified or created in plain text.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  // If passwordHash is already a valid bcrypt hash, do not re-hash
  if (BCRYPT_HASH_REGEX.test(this.passwordHash)) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compares a candidate plain text password with the stored hashed password.
 * @param {string} candidatePassword - Plain text password to check.
 * @returns {Promise<boolean>} True if password matches, false otherwise.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Static utility to hash a password outside of document save lifecycle.
 * @param {string} plainPassword - Plain text password.
 * @returns {Promise<string>} Bcrypt hash.
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  return bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model('User', userSchema);

export default User;
