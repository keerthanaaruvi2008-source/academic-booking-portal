/**
 * @fileoverview Resource Mongoose Schema and Model.
 * Represents bookable institutional resources such as seminar halls, computer labs,
 * smart classrooms, auditoriums, and specialized equipment.
 */

import mongoose from 'mongoose';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LIST,
  RESOURCE_STATUS,
  RESOURCE_STATUS_LIST,
} from '../config/constants.js';

/**
 * Location Sub-schema for physical positioning within campus buildings.
 */
const locationSchema = new mongoose.Schema(
  {
    building: {
      type: String,
      required: [true, 'Building name is required'],
      trim: true,
      maxlength: [100, 'Building name cannot exceed 100 characters'],
    },
    floor: {
      type: Number,
      default: 1,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room or unit number is required'],
      trim: true,
      maxlength: [50, 'Room number cannot exceed 50 characters'],
    },
  },
  { _id: false }
);

/**
 * Resource Schema definition.
 */
const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      maxlength: [150, 'Resource name cannot exceed 150 characters'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: RESOURCE_TYPE_LIST,
        message: 'Resource type `{VALUE}` is not supported. Must be one of: ' + RESOURCE_TYPE_LIST.join(', '),
      },
      default: RESOURCE_TYPES.CLASSROOM,
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Resource capacity is required'],
      min: [1, 'Capacity must be at least 1 person/item'],
      default: 30,
      index: true,
    },
    location: {
      type: locationSchema,
      required: [true, 'Location details are required'],
    },
    amenities: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: [true, 'Resource status is required'],
      enum: {
        values: RESOURCE_STATUS_LIST,
        message: 'Status `{VALUE}` is not supported. Must be one of: ' + RESOURCE_STATUS_LIST.join(', '),
      },
      default: RESOURCE_STATUS.AVAILABLE,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference (createdBy) is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimized filtering and availability queries
resourceSchema.index({ type: 1, status: 1, isActive: 1 });
resourceSchema.index({ capacity: 1, isActive: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
