import mongoose from 'mongoose';

const shortUrlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      maxlength: 2048,
      trim: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      maxlength: 80,
      trim: true,
      default: null,
    },
    clientId: {
      type: String,
      required: true,
      trim: true,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

// Compound index for cursor pagination per user: newest first
shortUrlSchema.index({ clientId: 1, createdAt: -1, _id: -1 });

export const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema, 'shorturls');
