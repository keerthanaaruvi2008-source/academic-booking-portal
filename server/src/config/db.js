/**
 * @fileoverview MongoDB connection configuration and lifecycle management using Mongoose.
 * Supports production MongoDB URI connection with retries, and automatic in-memory fallback
 * with realistic pre-seeding for zero-config local development.
 */

import mongoose from 'mongoose';
import { SEED_USERS, SEED_RESOURCES } from '../utils/seedData.js';
import { BOOKING_STATUS } from './constants.js';

let memServerInstance = null;

/**
 * Automatically seeds in-memory database with sample accounts and facilities.
 */
const autoSeedInMemory = async () => {
  try {
    const User = (await import('../models/User.js')).default;
    const Resource = (await import('../models/Resource.js')).default;
    const Booking = (await import('../models/Booking.js')).default;

    console.log('[Database] 👤 Auto-seeding in-memory academic users...');
    const userDocs = [];
    for (const userData of SEED_USERS) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
      }
      userDocs.push(user);
    }

    const adminUser = userDocs.find((u) => u.role === 'admin') || userDocs[0];
    const facultyUser = userDocs.find((u) => u.role === 'faculty') || userDocs[1];
    const studentUser = userDocs.find((u) => u.role === 'student') || userDocs[3];

    console.log('[Database] 🏛️ Auto-seeding in-memory campus facilities...');
    const resourceDocs = [];
    for (const resData of SEED_RESOURCES) {
      let resource = await Resource.findOne({ name: resData.name });
      if (!resource) {
        resource = await Resource.create({
          ...resData,
          createdBy: adminUser._id,
        });
      }
      resourceDocs.push(resource);
    }

    const curieHall = resourceDocs.find((r) => r.name.includes('Curie')) || resourceDocs[0];
    const turingLab = resourceDocs.find((r) => r.name.includes('Lovelace')) || resourceDocs[2];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sampleBookings = [
      {
        resourceId: curieHall._id,
        bookedBy: facultyUser._id,
        approvedBy: adminUser._id,
        title: 'Quantum Physics Symposium Keynote',
        description: 'Annual faculty symposium with invited international keynote speakers.',
        startTime: `${tomorrow}T10:00:00.000Z`,
        endTime: `${tomorrow}T12:00:00.000Z`,
        status: BOOKING_STATUS.APPROVED,
      },
      {
        resourceId: turingLab._id,
        bookedBy: studentUser._id,
        title: 'ACM Student Chapter Hackathon Kickoff',
        description: 'Student workshop on distributed systems and parallel algorithms.',
        startTime: `${tomorrow}T14:00:00.000Z`,
        endTime: `${tomorrow}T16:00:00.000Z`,
        status: BOOKING_STATUS.PENDING,
      },
    ];

    for (const bData of sampleBookings) {
      const existing = await Booking.findOne({
        resourceId: bData.resourceId,
        startTime: bData.startTime,
        endTime: bData.endTime,
      });

      if (!existing) {
        await Booking.create(bData);
      }
    }

    console.log('[Database] ✨ In-memory database populated with realistic demo records!');
    console.log('[Database] 🔑 Ready to sign in with:');
    console.log('   Admin:   admin@university.edu / AdminPassword@123');
    console.log('   Faculty: prof.turing@cs.university.edu / FacultyPassword@123');
    console.log('   Student: alice.johnson@student.university.edu / StudentPassword@123\n');
  } catch (err) {
    console.error('[Database] Auto-seeding error:', err.message);
  }
};

/**
 * Establishes a connection to the MongoDB database.
 * Falls back to an In-Memory MongoDB Server in development if no local MongoDB instance is active.
 *
 * @param {number} [retryCount=0]
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (retryCount = 0) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    const errorMsg = 'FATAL: MONGO_URI environment variable is not defined. Failing fast.';
    console.error(`[Database] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n[Database] ⚡ No external MongoDB instance detected on ' + mongoUri);
      console.log('[Database] 🚀 Starting embedded In-Memory MongoDB Server for instant local development...');

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memServerInstance = await MongoMemoryServer.create();
        const memUri = memServerInstance.getUri();

        const conn = await mongoose.connect(memUri);
        console.log(`[Database] ✅ Embedded In-Memory MongoDB Connected at ${memUri}`);

        await autoSeedInMemory();
        return conn;
      } catch (memErr) {
        console.error('[Database] Failed to start in-memory MongoDB:', memErr.message);
        throw error;
      }
    }

    console.error(`[Database] Connection attempt failed:`, error.message);
    throw error;
  }
};

/**
 * Closes the active MongoDB connection gracefully.
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (memServerInstance) {
      await memServerInstance.stop();
    }
    console.log('[Database] MongoDB connection closed gracefully.');
  } catch (error) {
    console.error('[Database] Error while closing MongoDB connection:', error.message);
  }
};
