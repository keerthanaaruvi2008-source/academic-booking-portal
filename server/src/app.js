/**
 * @fileoverview Express application configuration and core middleware pipeline.
 * Configures security, CORS, request parsing, logging, health check, and error handling.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { HTTP_STATUS } from './config/constants.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { sanitizeNoSql, apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or matching configured URL or ending in .vercel.app
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all during development & deployment
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for reading httpOnly refresh tokens
app.use(cookieParser());

// NoSQL query operator injection sanitizer
app.use(sanitizeNoSql);

// General API rate limiter
app.use('/api', apiLimiter);

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/**
 * Health check handler returning system status envelope.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const healthCheckHandler = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'academic-booking-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
};

// Health check endpoints
app.get('/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/ai', aiRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'RESOURCE_NOT_FOUND',
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
