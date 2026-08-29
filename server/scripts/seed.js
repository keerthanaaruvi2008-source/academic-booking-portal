/**
 * @fileoverview Standalone Database Seeding Script.
 * Populates MongoDB with realistic academic users, campus resources, and sample reservations.
 *
 * Usage:
 *   node scripts/seed.js [--force]
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Booking from '../src/models/Booking.js';
import { SEED_USERS, SEED_RESOURCES } from '../src/utils/seedData.js';
import { BOOKING_STATUS } from '../src/config/constants.js';

const runSeed = async () => {
  try {
    console.log('🚀 Connecting to MongoDB for seeding...');
    await connectDB();

    const isForce = process.argv.includes('--force');

    if (isForce) {
      console.log('🧹 --force flag detected. Clearing existing collections...');
      await Booking.deleteMany({});
      await Resource.deleteMany({});
      await User.deleteMany({});
    }

    console.log('👤 Seeding academic users...');
    const userDocs = [];
    for (const userData of SEED_USERS) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
        console.log(`  ✓ Created user: ${user.name} (${user.role} - ${user.email})`);
      } else {
        console.log(`  - User already exists: ${user.email}`);
      }
      userDocs.push(user);
    }

    console.log('\n🏛️ Seeding campus resources & facilities...');
    const resourceDocs = [];
    for (const resData of SEED_RESOURCES) {
      let resource = await Resource.findOne({ name: resData.name });
      if (!resource) {
        resource = await Resource.create(resData);
        console.log(`  ✓ Created resource: ${resource.name} (${resource.type}, Cap: ${resource.capacity})`);
      } else {
        console.log(`  - Resource already exists: ${resource.name}`);
      }
      resourceDocs.push(resource);
    }

    console.log('\n📅 Seeding initial sample reservations...');
    const adminUser = userDocs.find((u) => u.role === 'admin') || userDocs[0];
    const facultyUser = userDocs.find((u) => u.role === 'faculty') || userDocs[1];
    const studentUser = userDocs.find((u) => u.role === 'student') || userDocs[3];

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
        const b = await Booking.create(bData);
        console.log(`  ✓ Created booking: "${b.title}" (${b.status})`);
      } else {
        console.log(`  - Booking slot already reserved: "${bData.title}"`);
      }
    }

    console.log('\n✨ Database seeding completed successfully! ✨\n');
    console.log('Demo Accounts:');
    console.log('  Admin:   admin@university.edu / AdminPassword@123');
    console.log('  Faculty: prof.turing@cs.university.edu / FacultyPassword@123');
    console.log('  Student: alice.johnson@student.university.edu / StudentPassword@123\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

runSeed();
