/**
 * @fileoverview Authentication API service wrappers for frontend components.
 * Interfaces with the /api/v1/auth backend endpoints via the centralized Axios client.
 */

import api from './api.js';

/**
 * Sends registration payload to the server.
 * @param {object} userData
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} [userData.role]
 * @param {string} [userData.department]
 * @param {string} [userData.otp]
 * @returns {Promise<{ success: boolean, data: { user: object, accessToken: string } }>}
 */
export const registerUser = async (userData) => {
  return api.post('/auth/register', userData);
};

/**
 * Sends user login credentials to the server.
 * @param {object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ success: boolean, data: { user: object, accessToken: string } }>}
 */
export const loginUser = async (credentials) => {
  return api.post('/auth/login', credentials);
};

/**
 * Requests a 6-digit verification code sent to the specified email.
 * @param {object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.purpose]
 * @returns {Promise<{ success: boolean, data: { message: string, email: string, devOtp?: string } }>}
 */
export const sendOtp = async (params) => {
  return api.post('/auth/send-otp', params);
};

/**
 * Verifies a 6-digit OTP code and logs the user in.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.otp
 * @returns {Promise<{ success: boolean, data: { user: object, accessToken: string } }>}
 */
export const verifyOtp = async (params) => {
  return api.post('/auth/verify-otp', params);
};

/**
 * Requests a new access token using httpOnly refresh cookie.
 * @returns {Promise<{ success: boolean, data: { user: object, accessToken: string } }>}
 */
export const refreshToken = async () => {
  return api.post('/auth/refresh');
};

/**
 * Clears authentication session on server and client.
 * @returns {Promise<{ success: boolean, data: { message: string } }>}
 */
export const logoutUser = async () => {
  return api.post('/auth/logout');
};
