/**
 * @fileoverview Server entry point for Academic Event & Resource Booking Portal backend.
 * Validates critical environment variables, initializes database connection, and starts HTTP listener.
 */

import dotenv from 'dotenv';

// Load environment variables before importing app and db modules
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

/**
 * Validates that essential environment variables are defined.
 * Fails fast if any critical configuration is missing.
 * @throws {Error} If critical environment variables are unset.
 */
const validateEnv = () => {
  const requiredVars = ['MONGO_URI'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    const errorMsg = `FATAL: Missing required environment variable(s): ${missingVars.join(', ')}`;
    console.error(`[Server] ${errorMsg}`);
    process.exit(1);
  }
};

/**
 * Starts the HTTP server after validating environment and connecting to MongoDB.
 * @returns {Promise<import('http').Server>}
 */
const startServer = async () => {
  try {
    validateEnv();

    const PORT = process.env.PORT || 5000;

    // Start Express listener immediately
    const server = app.listen(PORT, () => {
      console.log(`[Server] Academic Booking API server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Server] Health check endpoint: http://localhost:${PORT}/api/v1/health`);
    });

    // Connect to database in background
    connectDB().catch((err) => {
      console.error('[Server] Database initialization background warning:', err.message);
    });

    /**
     * Handles graceful shutdown on process termination signals.
     * @param {string} signal
     */
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDB();
        console.log('[Server] Graceful shutdown completed. Process exiting.');
        process.exit(0);
      });

      // Force exit if shutdown hangs beyond 10 seconds
      setTimeout(() => {
        console.error('[Server] Forced shutdown timeout exceeded. Exiting immediately.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('[Server] Uncaught Exception thrown:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('[Server] Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
