import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";
import { connectToDatabase } from "@/lib/mongodb";
import { ForensicLogModel } from "@/lib/models";
import { sendTamperAlert } from "@/lib/email";
import UAParser from "ua-parser-js";

/**
 * GET /api/verify/[id]
 *
 * Verifies a certificate by ID, blockchain hash, or certificate number.
 *
 * FR-13: Every verification attempt is logged in the ForensicLog collection.
 * Attempts returning NOT_FOUND or REVOKED are flagged as suspicious and
 * trigger an instant email alert to the Super Admin (NFR-11: within 60 seconds).
 *
 * No PII is stored in the ForensicLog — only the hash submitted, the result,
 * network metadata, and device fingerprint from headers.
 */

// Resolve IP geolocation using ip-api.com (free, no API key required).
// Falls back to nulls gracefully if the service is unavailable.
async function resolveGeo(ip: string): Promise<{
  city: string | null;
  country: string | null;
  isp: string | null;
}> {
  try {
    // Skip geolocation for localhost/private IPs
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip === "unknown"
    ) {
      return { city: "Localhost", country: "Development", isp: "Local Network" };
    }

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,isp,status`, {
      signal: AbortSignal.timeout(3000), // 3-second timeout — never block the response
    });

    if (!res.ok) return { city: null, country: null, isp: null };

    const data = await res.json();
    if (data.status !== "success") return { city: null, country: null, isp: null };

    return {
      city: data.city || null,
      country: data.country || null,
      isp: data.isp || null,
    };
  } catch {
    // Network error or timeout — fail silently
    return { city: null, country: null, isp: null };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Capture request metadata for forensic logging ────────────────────
    const headers = request.headers;

    // Resolve real IP — Vercel sets x-forwarded-for
    const rawIp =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown";

    const userAgent = headers.get("user-agent") || "";

    // Parse browser / OS / device from User-Agent string
    const ua = new UAParser(userAgent);
    const browser = ua.getBrowser().name || null;
    const operatingSystem = ua.getOS().name || null;
    const deviceType = ua.getDevice().type || "desktop"; // null means desktop

    // ── Find certificate ─────────────────────────────────────────────────
    const normalizedHash = id.startsWith("0x") ? id : `0x${id}`;
    const all = await database.getAllCertificates();
    const certificate =
      all.find(
        (cert) =>
          cert.id === id ||
          cert.blockchainHash === id ||
          cert.blockchainHash === normalizedHash ||
          cert.certificateNumber === id,
      ) || null;

    // ── NOT FOUND ────────────────────────────────────────────────────────
    if (!certificate) {
      // Log forensic entry and alert Super Admin — fire and forget
      logAndAlert({
        hashSubmitted: id,
        result: "NOT_FOUND",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: null,
      }).catch((err) => console.error("[ForensicLog] Error logging NOT_FOUND:", err));

      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // ── Query blockchain ─────────────────────────────────────────────────
    const blockchainRecord = await blockchain.verifyCertificateHash(
      certificate.blockchainHash,
    );

    if (!blockchainRecord) {
      logAndAlert({
        hashSubmitted: id,
        result: "NOT_FOUND",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: certificate.id,
      }).catch((err) => console.error("[ForensicLog] Error logging blockchain NOT_FOUND:", err));

      return NextResponse.json(
        { error: "Certificate not found on blockchain" },
        { status: 404 },
      );
    }

    // ── REVOKED ──────────────────────────────────────────────────────────
    const isRevoked = certificate.status === "revoked";

    if (isRevoked) {
      // Log and alert — revoked certificate submission is suspicious
      logAndAlert({
        hashSubmitted: id,
        result: "REVOKED",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: certificate.id,
      }).catch((err) => console.error("[ForensicLog] Error logging REVOKED:", err));
    } else {
      // VALID — log without flagging (for full audit trail — FR-17)
      logOnly({
        hashSubmitted: id,
        result: "VALID",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: certificate.id,
      }).catch((err) => console.error("[ForensicLog] Error logging VALID:", err));
    }

    // ── Build response ───────────────────────────────────────────────────
    const blockchainResponse: Record<string, unknown> = {
      status: isRevoked ? "REVOKED" : "VALID",
      txHash: blockchainRecord.transactionHash,
      blockNumber: blockchainRecord.blockNumber,
      certificateHash: blockchainRecord.certificateHash,
      timestamp: blockchainRecord.timestamp,
    };

    if (isRevoked) {
      blockchainResponse.revocationTxHash = certificate.revocationTxHash;
      blockchainResponse.revocationBlockNumber = certificate.revocationBlockNumber;
      blockchainResponse.revokedAt = certificate.revokedAt;
      blockchainResponse.revocationReason = certificate.revocationReason;
    }

    const publicCertificate = {
      id: certificate.id,
      studentName: certificate.studentName,
      programmeOfStudy: certificate.programmeOfStudy,
      classOfDegree: certificate.classOfDegree,
      dateOfAward: certificate.dateOfAward,
      certificateNumber: certificate.certificateNumber,
      institutionName: certificate.institutionName,
      certificateType: certificate.certificateType,
      status: certificate.status,
      ipfsCid: certificate.ipfsCid,
      revocationReason: certificate.revocationReason,
      revokedAt: certificate.revokedAt,
      viceChancellor: certificate.viceChancellor,
    };

    return NextResponse.json({
      certificate: publicCertificate,
      blockchain: blockchainResponse,
      blockchainVerified: true,
    });

  } catch (error) {
    console.error(`[Verify API] Error:`, error);
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — fire-and-forget logging so they never delay the API response
// ─────────────────────────────────────────────────────────────────────────────

interface LogPayload {
  hashSubmitted: string;
  result: "VALID" | "REVOKED" | "NOT_FOUND";
  ipAddress: string;
  userAgent: string;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  certificateId: string | null;
}

/**
 * logAndAlert — saves a flagged ForensicLog entry and sends tamper alert email.
 * Used for NOT_FOUND and REVOKED results (suspicious attempts).
 */
async function logAndAlert(payload: LogPayload): Promise<void> {
  await connectToDatabase();
  const geo = await resolveGeo(payload.ipAddress);

  const log = await ForensicLogModel.create({
    hashSubmitted: payload.hashSubmitted,
    result: payload.result,
    flagged: true,
    certificateId: payload.certificateId,
    ipAddress: payload.ipAddress,
    city: geo.city,
    country: geo.country,
    isp: geo.isp,
    browser: payload.browser,
    deviceType: payload.deviceType,
    operatingSystem: payload.operatingSystem,
    userAgent: payload.userAgent,
  });

  // Trigger NFR-11: Email Alert
  await sendTamperAlert(log).catch((err) =>
    console.error("[ForensicLog] Failed to send email alert:", err)
  );
}

/**
 * logOnly — saves an unflagged ForensicLog entry for clean audit trails.
 */
async function logOnly(payload: LogPayload): Promise<void> {
  await connectToDatabase();
  const geo = await resolveGeo(payload.ipAddress);

  await ForensicLogModel.create({
    hashSubmitted: payload.hashSubmitted,
    result: payload.result,
    flagged: false,
    certificateId: payload.certificateId,
    ipAddress: payload.ipAddress,
    city: geo.city,
    country: geo.country,
    isp: geo.isp,
    browser: payload.browser,
    deviceType: payload.deviceType,
    operatingSystem: payload.operatingSystem,
    userAgent: payload.userAgent,
  });
}
