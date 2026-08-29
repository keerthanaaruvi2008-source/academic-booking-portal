/**
 * @fileoverview Booking Mongoose Schema and Model.
 * Manages institutional resource reservations with compound index for conflict prevention.
 */

import mongoose from 'mongoose';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LIST,
} from '../config/constants.js';

const bookingSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource ID is required'],
      index: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'BookedBy user ID is required'],
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Booking title/purpose is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    startTime: {
      type: Date,
      required: [true, 'Booking start time (UTC) is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Booking end time (UTC) is required'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: BOOKING_STATUS_LIST,
        message: 'Status `{VALUE}` is not supported. Must be one of: ' + BOOKING_STATUS_LIST.join(', '),
      },
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
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

// Compound index for high-performance overlap queries and uniqueness enforcement
bookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ resourceId: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
