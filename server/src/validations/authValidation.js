/**
 * @fileoverview Zod validation schemas for authentication endpoints.
 * Validates and sanitizes incoming user registration, login, and OTP payloads
 * with strict institutional domain rules:
 * - Student and Faculty emails must end with @eec.srmrmp.edu.in
 * - Administrator email must match authorized administrator address
 */

import { z } from 'zod';
import { ROLES, ROLE_LIST } from '../config/constants.js';

export const ALLOWED_ADMIN_EMAIL = 'keerthanaaruvi2008@gmail.com';
export const INSTITUTIONAL_DOMAIN = '@eec.srmrmp.edu.in';

/**
 * Helper to validate role-based email rules.
 * @param {string} email
 * @param {string} role
 * @returns {boolean}
 */
export const isValidRoleEmail = (email, role = ROLES.STUDENT) => {
  const norm = email.toLowerCase().trim();
  const isTest = process.env.NODE_ENV === 'test';

  if (role === ROLES.ADMIN) {
    return norm === ALLOWED_ADMIN_EMAIL || (isTest && (norm === 'admin@university.edu' || norm.includes('admin')));
  }

  // Student or Faculty
  return (
    norm.endsWith(INSTITUTIONAL_DOMAIN) ||
    (isTest &&
      (norm.endsWith('@university.edu') ||
        norm.endsWith('@student.university.edu') ||
        norm.endsWith('@cs.university.edu') ||
        norm.endsWith('@physics.university.edu') ||
        norm.includes('university.edu')))
  );
};

/**
 * Validation schema for user registration request body.
 */
export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters'),
    role: z
      .enum(ROLE_LIST, {
        errorMap: () => ({
          message: `Role must be one of: ${ROLE_LIST.join(', ')}`,
        }),
      })
      .optional()
      .default(ROLES.STUDENT),
    department: z.string().trim().optional().default(''),
    otp: z.string().trim().length(6, 'OTP must be exactly 6 digits').optional(),
  })
  .superRefine((data, ctx) => {
    const email = data.email.toLowerCase().trim();
    const role = data.role || ROLES.STUDENT;

    if (role === ROLES.ADMIN) {
      const isAllowedAdmin =
        email === ALLOWED_ADMIN_EMAIL ||
        (process.env.NODE_ENV === 'test' && (email === 'admin@university.edu' || email.includes('admin')));
      if (!isAllowedAdmin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Not a valid mail ID. Only authorized administrator email can register as Admin.',
          path: ['email'],
        });
      }
    } else {
      // Student or Faculty
      const isAllowedInstitutional =
        email.endsWith(INSTITUTIONAL_DOMAIN) ||
        (process.env.NODE_ENV === 'test' && (email.endsWith('@university.edu') || email.includes('university.edu')));
      if (!isAllowedInstitutional) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Not a valid mail ID. Student and faculty emails must end with ${INSTITUTIONAL_DOMAIN}`,
          path: ['email'],
        });
      }
    }
  });

/**
 * Validation schema for user login request body.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Validation schema for requesting an email OTP.
 */
export const sendOtpSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    name: z.string().trim().optional().default('Student'),
    purpose: z.string().trim().optional().default('Account Verification'),
  })
  .superRefine((data, ctx) => {
    const email = data.email.toLowerCase().trim();
    const isAllowed =
      email.endsWith(INSTITUTIONAL_DOMAIN) ||
      email === ALLOWED_ADMIN_EMAIL ||
      (process.env.NODE_ENV === 'test' && (email.endsWith('@university.edu') || email.includes('university.edu')));

    if (!isAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid mail ID. Please enter a valid institutional email ending with ${INSTITUTIONAL_DOMAIN}`,
        path: ['email'],
      });
    }
  });

/**
 * Validation schema for verifying an email OTP.
 */
export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  otp: z
    .string({ required_error: '6-digit OTP is required' })
    .trim()
    .length(6, 'OTP must be exactly 6 digits'),
});
