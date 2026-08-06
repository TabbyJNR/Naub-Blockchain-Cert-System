import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ForensicLogModel } from "@/lib/models";

/**
 * GET /api/admin/forensic-log
 *
 * Returns forensic log entries for the Super Admin dashboard.
 *
 * Query params:
 *   ?flagged=true      — return only suspicious (NOT_FOUND / REVOKED) entries
 *   ?certificateId=x   — return all entries for a specific certificate (audit trail FR-17)
 *   ?limit=50          — max entries to return (default 50, max 200)
 *   ?unread=true       — return only unacknowledged flagged entries (for bell badge count)
 *
 * No PII is stored in ForensicLog — safe to return to admin dashboard.
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const flagged = url.searchParams.get("flagged") === "true";
    const certificateId = url.searchParams.get("certificateId");
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      200
    );

    // Build query
    const query: Record<string, unknown> = {};

    if (certificateId) {
      // Audit trail: all entries for one specific certificate
      query.certificateId = certificateId;
    } else if (unreadOnly) {
      // Bell badge: count of unacknowledged flagged alerts only
      query.flagged = true;
      query.acknowledged = false;
    } else if (flagged) {
      // Forensic log page: all suspicious entries
      query.flagged = true;
    }
    // No filter = all entries (full system log)

    const entries = await ForensicLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // For unread-only, return just the count for the bell badge
    if (unreadOnly) {
      return NextResponse.json({ unreadCount: entries.length });
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("[ForensicLog API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch forensic log" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/forensic-log
 *
 * Marks all unacknowledged flagged entries as acknowledged.
 * Called when the Super Admin opens the notification panel — resets bell badge to 0.
 */
export async function PATCH() {
  try {
    await connectToDatabase();

    const result = await ForensicLogModel.updateMany(
      { flagged: true, acknowledged: false },
      { $set: { acknowledged: true } }
    );

    return NextResponse.json({
      acknowledged: result.modifiedCount,
      message: `${result.modifiedCount} alert(s) marked as acknowledged`,
    });
  } catch (error) {
    console.error("[ForensicLog API] PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alerts" },
      { status: 500 }
    );
  }
}
