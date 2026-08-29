/**
 * @fileoverview Authentication Context and Provider.
 * Provides global state management for the authenticated user, token handling,
 * persistent session preservation across page reloads, and login/register/logout methods.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

/**
 * Authentication Provider component wrapping application tree.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  // Synchronous initialization from localStorage to prevent route bouncing on refresh
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('authUser');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(() => !localStorage.getItem('accessToken'));
  const [error, setError] = useState(null);

  /**
   * Initializes session on app load by validating / refreshing credentials in background.
   */
  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.refreshToken();
      if (response.success && response.data) {
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('authUser', JSON.stringify(response.data.user));
      }
    } catch {
      // If refresh cookie failed, keep cached user session if token exists, or clean up if totally invalid
      if (!localStorage.getItem('authUser')) {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authUser');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Performs user login.
   * @param {object} credentials - { email, password }
   * @returns {Promise<object>} Authenticated user data.
   */
  const login = async (credentials) => {
    setError(null);
    try {
      const response = await authService.loginUser(credentials);
      const { user: authUser, accessToken: newAccessToken } = response.data;

      setUser(authUser);
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('authUser', JSON.stringify(authUser));

      return authUser;
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Performs user registration.
   * @param {object} userData - { name, email, password, role, department }
   * @returns {Promise<object>} Newly created user data.
   */
  const register = async (userData) => {
    setError(null);
    try {
      const response = await authService.registerUser(userData);
      const { user: authUser, accessToken: newAccessToken } = response.data;

      setUser(authUser);
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('authUser', JSON.stringify(authUser));

      return authUser;
    } catch (err) {
      const errorMessage = err.message || 'Registration failed. Please check your information.';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Performs user login via 6-digit OTP code.
   * @param {object} params - { email, otp }
   * @returns {Promise<object>} Authenticated user data.
   */
  const loginWithOtp = async ({ email, otp }) => {
    setError(null);
    try {
      const response = await authService.verifyOtp({ email, otp });
      const { user: authUser, accessToken: newAccessToken } = response.data;

      setUser(authUser);
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('authUser', JSON.stringify(authUser));

      return authUser;
    } catch (err) {
      const errorMessage = err.message || 'OTP verification failed.';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Logs out the current user and clears session state.
   */
  const logout = async () => {
    try {
      await authService.logoutUser();
    } catch (err) {
      console.warn('Logout request encountered an error:', err.message);
    } finally {
      setUser(null);
      setAccessToken(null);
      setError(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    error,
    login,
    loginWithOtp,
    register,
    logout,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access authentication context throughout components.
 * @returns {{
 *   user: object|null,
 *   accessToken: string|null,
 *   loading: boolean,
 *   error: string|null,
 *   login: (credentials: object) => Promise<object>,
 *   register: (userData: object) => Promise<object>,
 *   logout: () => Promise<void>,
 *   isAuthenticated: boolean
 * }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
