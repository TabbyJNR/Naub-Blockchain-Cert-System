/**
 * Fixed-window rate limiter backed by MongoDB.
 *
 * Used to protect the admin login flow and certificate issuance from
 * brute-force / spam abuse. Falls open (allows the request) if MongoDB
 * is not configured or unreachable, so a database outage never locks
 * legitimate users out - this is a defense-in-depth control, not the
 * system's only line of defense.
 */

import { connectToDatabase } from "./mongodb";
import { RateLimitModel } from "./rate-limit-model";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * @param key Unique identifier for this rate-limit bucket, e.g.
 *   `login:${ipAddress}` or `issue:${walletAddress}`.
 * @param maxRequests Maximum requests allowed within the window.
 * @param windowMs Length of the fixed window in milliseconds.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const connected = await connectToDatabase();
    if (!connected) {
      // No database configured (e.g. local dev without MONGODB_URI) -
      // fail open rather than blocking all requests.
      return { allowed: true, remaining: maxRequests };
    }

    const now = Date.now();
    const existing = await RateLimitModel.findOne({ key });

    if (!existing || now - existing.windowStart >= windowMs) {
      // New window
      await RateLimitModel.findOneAndUpdate(
        { key },
        { key, windowStart: now, count: 1 },
        { upsert: true },
      );
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (existing.count >= maxRequests) {
      const retryAfterMs = windowMs - (now - existing.windowStart);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    existing.count += 1;
    await existing.save();
    return { allowed: true, remaining: maxRequests - existing.count };
  } catch (error) {
    console.error("[RateLimit] Error, failing open:", error);
    return { allowed: true, remaining: maxRequests };
  }
}

/** Extracts the caller's IP address from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
