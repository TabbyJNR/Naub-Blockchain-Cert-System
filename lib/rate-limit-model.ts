/**
 * Mongoose schema for rate-limit tracking.
 *
 * A fixed-window counter per (key, route) pair. Stored in MongoDB rather
 * than in-memory because Vercel serverless functions do not reliably
 * share memory between invocations/instances - an in-memory counter
 * would silently reset on every cold start and provide no real
 * protection.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface RateLimitDocument extends Document {
  key: string; // e.g. "login:203.0.113.5" or "issue:0xabc..."
  windowStart: number; // ms epoch when the current window began
  count: number;
}

const RateLimitSchema = new Schema<RateLimitDocument>({
  key: { type: String, required: true, unique: true, index: true },
  windowStart: { type: Number, required: true },
  count: { type: Number, required: true, default: 0 },
});

export const RateLimitModel: Model<RateLimitDocument> =
  mongoose.models.RateLimit || mongoose.model<RateLimitDocument>("RateLimit", RateLimitSchema);
