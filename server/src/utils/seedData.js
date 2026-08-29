/**
 * @fileoverview Seed data definitions for the Academic Event & Resource Booking Portal.
 * Contains realistic academic accounts, facilities, and initial reservations.
 */

import { ROLES, RESOURCE_TYPES, RESOURCE_STATUS, BOOKING_STATUS } from '../config/constants.js';

export const SEED_USERS = [
  {
    name: 'Keerthana (Portal Administrator)',
    email: 'keerthanaaruvi2008@gmail.com',
    passwordHash: 'AdminPassword@123',
    role: ROLES.ADMIN,
    isActive: true,
  },
  {
    name: 'Portal Administrator',
    email: 'admin@university.edu',
    passwordHash: 'AdminPassword@123',
    role: ROLES.ADMIN,
    isActive: true,
  },
  {
    name: 'SRM Student (Keerthana)',
    email: '310625243103@eec.srmrmp.edu.in',
    passwordHash: 'StudentPassword@123',
    role: ROLES.STUDENT,
    isActive: true,
  },
  {
    name: 'SRM Student',
    email: '310625243075@eec.srmrmp.edu.in',
    passwordHash: 'StudentPassword@123',
    role: ROLES.STUDENT,
    isActive: true,
  },
  {
    name: 'Prof. Alan Turing',
    email: 'prof.turing@eec.srmrmp.edu.in',
    passwordHash: 'FacultyPassword@123',
    role: ROLES.FACULTY,
    isActive: true,
  },
  {
    name: 'Dr. Marie Curie',
    email: 'dr.curie@physics.university.edu',
    passwordHash: 'FacultyPassword@123',
    role: ROLES.FACULTY,
    isActive: true,
  },
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@student.university.edu',
    passwordHash: 'StudentPassword@123',
    role: ROLES.STUDENT,
    isActive: true,
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@student.university.edu',
    passwordHash: 'StudentPassword@123',
    role: ROLES.STUDENT,
    isActive: true,
  },
  {
    name: 'Carol Danvers',
    email: 'carol.danvers@student.university.edu',
    passwordHash: 'StudentPassword@123',
    role: ROLES.STUDENT,
    isActive: true,
  },
];

export const SEED_RESOURCES = [
  {
    name: 'Marie Curie Seminar Hall',
    type: RESOURCE_TYPES.SEMINAR_HALL,
    capacity: 120,
    location: {
      building: 'East Science Complex',
      floor: 1,
      roomNumber: 'HALL-A',
    },
    amenities: ['Stage', 'Surround Sound', 'HD Projector', 'Air Conditioning', 'Live Streaming'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Alan Turing Grand Auditorium',
    type: RESOURCE_TYPES.AUDITORIUM,
    capacity: 350,
    location: {
      building: 'Main Campus Tower',
      floor: 1,
      roomNumber: 'AUD-01',
    },
    amenities: ['Tiered Seating', 'Stage Lighting', 'Dual 4K Projectors', 'Wireless Mics', 'AV Booth'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Ada Lovelace Computing Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 45,
    location: {
      building: 'Turing Computer Block',
      floor: 2,
      roomNumber: 'LAB-201',
    },
    amenities: ['45 High-Performance Linux PCs', 'Gigabit Ethernet', 'Interactive Smartboard'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Von Neumann Robotics & AI Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 30,
    location: {
      building: 'Turing Computer Block',
      floor: 3,
      roomNumber: 'LAB-305',
    },
    amenities: ['GPU Compute Cluster', 'Soldering Stations', '3D Printers', 'Robotics Workbenches'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Claude Shannon Network Systems Lab',
    type: RESOURCE_TYPES.LAB,
    capacity: 35,
    location: {
      building: 'Turing Computer Block',
      floor: 2,
      roomNumber: 'LAB-204',
    },
    amenities: ['Cisco Network Racks', 'Hardware Protocol Analyzers', 'Dual Monitors'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Isaac Newton Lecture Hall 101',
    type: RESOURCE_TYPES.CLASSROOM,
    capacity: 75,
    location: {
      building: 'Academic Block A',
      floor: 1,
      roomNumber: 'LH-101',
    },
    amenities: ['Tiered Desks', 'Document Camera', 'Microphone System', 'Whiteboards'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Galileo Smart Classroom 202',
    type: RESOURCE_TYPES.CLASSROOM,
    capacity: 40,
    location: {
      building: 'Academic Block B',
      floor: 2,
      roomNumber: 'CR-202',
    },
    amenities: ['Interactive Touchscreen Displays', 'Flexible Group Seating', 'Video Conferencing'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Albert Einstein Theoretical Physics Room',
    type: RESOURCE_TYPES.CLASSROOM,
    capacity: 50,
    location: {
      building: 'Academic Block A',
      floor: 3,
      roomNumber: 'CR-303',
    },
    amenities: ['Floor-to-Ceiling Chalkboards', 'Overhead Projector', 'Sound Dampening'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Mobile 4K Laser Cinema Projector Unit',
    type: RESOURCE_TYPES.EQUIPMENT,
    capacity: 1,
    location: {
      building: 'Central Media Services Hub',
      floor: 1,
      roomNumber: 'EQ-04',
    },
    amenities: ['4K Ultra-Short Throw', 'HDMI / Wireless Casting', 'Tripod Screen Included'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
  {
    name: 'Wireless Quad-Channel Microphone & PA Kit',
    type: RESOURCE_TYPES.EQUIPMENT,
    capacity: 1,
    location: {
      building: 'Central Media Services Hub',
      floor: 1,
      roomNumber: 'EQ-12',
    },
    amenities: ['4 Lapel & Handheld Mics', 'Portable Bluetooth PA Speaker', 'Rechargeable Batteries'],
    status: RESOURCE_STATUS.AVAILABLE,
    isActive: true,
  },
];
