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

/**
 * Checks rate limits keyed on BOTH the caller's IP address and their wallet
 * address, and returns "not allowed" if either limit is exceeded.
 *
 * IP-only limiting is trivially bypassed by rotating through a VPN or proxy
 * pool, since a new IP resets the counter. Wallet-based limiting closes
 * that gap for authenticated admin actions: a wallet address cannot be
 * rotated the way an IP can, since it is cryptographically tied to the
 * private key the caller must sign transactions with. Both checks run so
 * that an attacker must evade IP AND wallet limits simultaneously, not
 * just one or the other.
 */
export async function checkRateLimitByIpAndWallet(
  routeName: string,
  ip: string,
  walletAddress: string | null | undefined,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ipResult = await checkRateLimit(`${routeName}:ip:${ip}`, maxRequests, windowMs);
  if (!ipResult.allowed) return ipResult;

  if (walletAddress) {
    const walletResult = await checkRateLimit(
      `${routeName}:wallet:${walletAddress.toLowerCase()}`,
      maxRequests,
      windowMs,
    );
    if (!walletResult.allowed) return walletResult;
  }

  return ipResult;
}
