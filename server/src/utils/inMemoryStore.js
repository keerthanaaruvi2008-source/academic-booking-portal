/**
 * @fileoverview Persistent local store fallback with disk sync.
 * Provides immediate operational storage for users, resources, and bookings
 * persisted to disk across nodemon restarts.
 */

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_USERS, SEED_RESOURCES } from './seedData.js';
import { BOOKING_STATUS } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db_store.json');

let users = [];
let resources = [];
let bookings = [];

const generateId = () =>
  Math.random().toString(16).substring(2, 10) +
  Math.random().toString(16).substring(2, 10) +
  Math.random().toString(16).substring(2, 10);

const attachUserMethods = (u) => {
  u.comparePassword = async function (candidate) {
    if (!candidate || !this.passwordHash) return false;
    return bcrypt.compare(candidate, this.passwordHash);
  };
  return u;
};

const saveToDisk = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave = {
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        department: u.department,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      resources: resources.map((r) => ({
        _id: r._id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        location: r.location,
        amenities: r.amenities,
        status: r.status,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      bookings,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Failed to persist data to disk:', err.message);
  }
};

export const initMemoryStoreSync = () => {
  if (users.length > 0) return;

  // Try loading from disk first
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (parsed.users && parsed.users.length > 0) {
        users = parsed.users.map(attachUserMethods);
        resources = parsed.resources || [];
        bookings = parsed.bookings || [];

        // Ensure key seed users exist
        for (const s of SEED_USERS) {
          const exists = users.find((u) => u.email === s.email.toLowerCase());
          if (!exists) {
            const passwordHash = bcrypt.hashSync(s.password, 10);
            users.push(
              attachUserMethods({
                _id: generateId(),
                name: s.name,
                email: s.email.toLowerCase(),
                passwordHash,
                role: s.role,
                department: s.department || 'Computer Science and Engineering',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            );
          }
        }
        saveToDisk();
        return;
      }
    }
  } catch (e) {
    console.warn('[Store] Could not read db_store.json, initializing fresh seed.');
  }

  // Initialize Users Synchronously from SEED_USERS
  for (const u of SEED_USERS) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    users.push(
      attachUserMethods({
        _id: generateId(),
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash,
        role: u.role,
        department: u.department || 'Computer Science and Engineering',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  }

  // Initialize Resources from SEED_RESOURCES
  for (const r of SEED_RESOURCES) {
    resources.push({
      _id: generateId(),
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      location: { ...r.location },
      amenities: [...r.amenities],
      status: r.status,
      isActive: true,
      createdBy: users[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Initialize Sample Bookings
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0];

  const studentUser1 = users.find((u) => u.email === '310625243103@eec.srmrmp.edu.in') || users[2] || users[0];
  const studentUser2 = users.find((u) => u.email === '310625243075@eec.srmrmp.edu.in') || users[3] || users[0];
  const facultyUser = users.find((u) => u.email === 'prof.turing@eec.srmrmp.edu.in') || users[4] || users[0];
  const adminUser = users.find((u) => u.email === 'keerthanaaruvi2008@gmail.com') || users[0];

  bookings = [
    {
      _id: generateId(),
      resourceId: resources[0] || { name: 'Marie Curie Seminar Hall' },
      bookedBy: studentUser1,
      approvedBy: adminUser,
      title: 'Quantum Computing Seminar',
      description: 'Departmental seminar on quantum state entanglement.',
      startTime: `${tomorrow}T10:00:00.000Z`,
      endTime: `${tomorrow}T12:00:00.000Z`,
      status: BOOKING_STATUS.APPROVED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: generateId(),
      resourceId: resources[1] || resources[0],
      bookedBy: studentUser2,
      approvedBy: null,
      title: 'AI & Machine Learning Hackathon Workshop',
      description: 'Student-led deep learning model building session.',
      startTime: `${tomorrow}T14:00:00.000Z`,
      endTime: `${tomorrow}T17:00:00.000Z`,
      status: BOOKING_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: generateId(),
      resourceId: resources[2] || resources[0],
      bookedBy: facultyUser,
      approvedBy: null,
      title: 'Robotics Autonomous Navigation Demo',
      description: 'Faculty robotics presentation and lab hardware demonstration.',
      startTime: `${dayAfter}T09:00:00.000Z`,
      endTime: `${dayAfter}T12:00:00.000Z`,
      status: BOOKING_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: generateId(),
      resourceId: resources[3] || resources[0],
      bookedBy: studentUser1,
      approvedBy: adminUser,
      title: 'Cloud Infrastructure & DevOps Masterclass',
      description: 'Hands-on Kubernetes and Docker deployment session.',
      startTime: `${inThreeDays}T13:00:00.000Z`,
      endTime: `${inThreeDays}T15:00:00.000Z`,
      status: BOOKING_STATUS.APPROVED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  saveToDisk();
};

// Immediate synchronous initialization
initMemoryStoreSync();

export const memStore = {
  getUsers: () => {
    if (users.length === 0) initMemoryStoreSync();
    return users;
  },
  getUserByEmail: (email) => {
    if (users.length === 0) initMemoryStoreSync();
    const u = users.find((user) => user.email === email.toLowerCase() && user.isActive);
    if (u && (u.email === 'keerthanaaruvi2008@gmail.com' || u.email === 'admin@university.edu')) {
      u.role = 'admin';
    }
    return u;
  },
  getUserById: (id) => {
    if (users.length === 0) initMemoryStoreSync();
    const u = users.find((user) => user._id === id.toString() && user.isActive);
    if (u && (u.email === 'keerthanaaruvi2008@gmail.com' || u.email === 'admin@university.edu')) {
      u.role = 'admin';
    }
    return u;
  },
  addUser: (user) => {
    attachUserMethods(user);
    users.push(user);
    saveToDisk();
    return user;
  },
  saveToDisk: () => {
    saveToDisk();
  },

  getResources: () => {
    if (resources.length === 0) initMemoryStoreSync();
    return resources.filter((r) => r.isActive);
  },
  getResourceById: (id) => {
    if (resources.length === 0) initMemoryStoreSync();
    return resources.find((r) => r._id === id.toString() && r.isActive);
  },
  addResource: (res) => {
    resources.push(res);
    saveToDisk();
    return res;
  },
  updateResource: (id, updates) => {
    const idx = resources.findIndex((r) => r._id === id.toString());
    if (idx !== -1) {
      resources[idx] = { ...resources[idx], ...updates, updatedAt: new Date().toISOString() };
      saveToDisk();
      return resources[idx];
    }
    return null;
  },
  deleteResource: (id) => {
    const idx = resources.findIndex((r) => r._id === id.toString());
    if (idx !== -1) {
      resources[idx].isActive = false;
      saveToDisk();
      return true;
    }
    return false;
  },

  getBookings: () => {
    if (bookings.length === 0) initMemoryStoreSync();
    return bookings;
  },
  getBookingById: (id) => {
    if (bookings.length === 0) initMemoryStoreSync();
    return bookings.find((b) => b._id === id.toString());
  },
  addBooking: (b) => {
    bookings.push(b);
    saveToDisk();
    return b;
  },
  updateBooking: (id, updates) => {
    const idx = bookings.findIndex((b) => b._id === id.toString());
    if (idx !== -1) {
      bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
      saveToDisk();
      return bookings[idx];
    }
    return null;
  },
  deleteBooking: (id) => {
    const idx = bookings.findIndex((b) => b._id === id.toString());
    if (idx !== -1) {
      bookings.splice(idx, 1);
      saveToDisk();
      return true;
    }
    return false;
  },
};

export default memStore;
