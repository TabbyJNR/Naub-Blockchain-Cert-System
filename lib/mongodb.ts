/**
 * MongoDB connection helper.
 *
 * Vercel serverless functions can spin up many concurrent instances, and
 * each cold start would otherwise open a brand new MongoDB connection.
 * This module caches the connection promise on the global object so that
 * warm function invocations reuse the existing connection instead of
 * opening a new one each time, which is the standard pattern recommended
 * by both Vercel and MongoDB for serverless deployments.
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    console.warn(
      "[MongoDB] MONGODB_URI is not set — the system will run without persistent storage."
    );
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global._mongooseConnectionPromise) {
    global._mongooseConnectionPromise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    await global._mongooseConnectionPromise;
    return mongoose;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    global._mongooseConnectionPromise = undefined;
    throw error;
  }
}
