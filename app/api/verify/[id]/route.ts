import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";
import { connectToDatabase } from "@/lib/mongodb";
import { ForensicLogModel } from "@/lib/models";
import { sendTamperAlert } from "@/lib/email";

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
 *
 * Note: ua-parser-js is intentionally NOT used here to avoid a build-time
 * dependency. Browser/OS/device are parsed with lightweight inline regexes
 * that work in the Next.js Edge/Node.js runtime without any extra packages.
 */

// ── Lightweight User-Agent parser (no external dependency) ────────────────

function parseUserAgent(ua: string): {
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
} {
  if (!ua) return { browser: null, operatingSystem: null, deviceType: null };

  // Browser
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";
  else if (/Chromium/i.test(ua)) browser = "Chromium";

  // OS
  let operatingSystem: string | null = null;
  if (/Windows NT 10/i.test(ua)) operatingSystem = "Windows 10/11";
  else if (/Windows NT/i.test(ua)) operatingSystem = "Windows";
  else if (/Android/i.test(ua)) operatingSystem = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) operatingSystem = "iOS";
  else if (/Mac OS X/i.test(ua)) operatingSystem = "macOS";
  else if (/Linux/i.test(ua)) operatingSystem = "Linux";
  else if (/CrOS/i.test(ua)) operatingSystem = "ChromeOS";

  // Device type
  let deviceType: string | null = "desktop";
  if (/Mobi|Android(?!.*Tablet)|iPhone/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

  return { browser, operatingSystem, deviceType };
}

// ── IP Geolocation (free, no API key, 3-second timeout) ───────────────────

async function resolveGeo(ip: string): Promise<{
  city: string | null;
  country: string | null;
  isp: string | null;
}> {
  try {
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip === "unknown" ||
      ip === "::ffff:127.0.0.1"
    ) {
      return { city: "Localhost", country: "Development", isp: "Local Network" };
    }

    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=city,country,isp,status`,
      { signal: AbortSignal.timeout(3000) }
    );

    if (!res.ok) return { city: null, country: null, isp: null };
    const data = await res.json();
    if (data.status !== "success") return { city: null, country: null, isp: null };

    return {
      city: data.city || null,
      country: data.country || null,
      isp: data.isp || null,
    };
  } catch {
    return { city: null, country: null, isp: null };
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Capture request metadata for forensic logging
    const headers = request.headers;
    const rawIp =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown";
    const userAgent = headers.get("user-agent") || "";
    const { browser, operatingSystem, deviceType } = parseUserAgent(userAgent);

    // Find certificate in database
    const normalizedHash = id.startsWith("0x") ? id : `0x${id}`;
    const all = await database.getAllCertificates();
    const certificate =
      all.find(
        (cert) =>
          cert.id === id ||
          cert.blockchainHash === id ||
          cert.blockchainHash === normalizedHash ||
          cert.certificateNumber === id
      ) || null;

    // NOT FOUND
    if (!certificate) {
      logAndAlert({
        hashSubmitted: id,
        result: "NOT_FOUND",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: null,
      }).catch((err) =>
        console.error("[ForensicLog] Error logging NOT_FOUND:", err)
      );

      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Query blockchain
    const blockchainRecord = await blockchain.verifyCertificateHash(
      certificate.blockchainHash
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
      }).catch((err) =>
        console.error("[ForensicLog] Error logging blockchain NOT_FOUND:", err)
      );

      return NextResponse.json(
        { error: "Certificate not found on blockchain" },
        { status: 404 }
      );
    }

    // REVOKED check
    const isRevoked = certificate.status === "revoked";

    if (isRevoked) {
      logAndAlert({
        hashSubmitted: id,
        result: "REVOKED",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: certificate.id,
      }).catch((err) =>
        console.error("[ForensicLog] Error logging REVOKED:", err)
      );
    } else {
      // VALID — log without flagging (for full audit trail FR-17)
      logOnly({
        hashSubmitted: id,
        result: "VALID",
        ipAddress: rawIp,
        userAgent,
        browser,
        operatingSystem,
        deviceType,
        certificateId: certificate.id,
      }).catch((err) =>
        console.error("[ForensicLog] Error logging VALID:", err)
      );
    }

    // Build response
    const blockchainResponse: Record<string, unknown> = {
      status: isRevoked ? "REVOKED" : "VALID",
      txHash: blockchainRecord.transactionHash,
      blockNumber: blockchainRecord.blockNumber,
      certificateHash: blockchainRecord.certificateHash,
      timestamp: blockchainRecord.timestamp,
    };

    if (isRevoked) {
      blockchainResponse.revocationTxHash = certificate.revocationTxHash;
      blockchainResponse.revocationBlockNumber =
        certificate.revocationBlockNumber;
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
      { status: 500 }
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
 * logAndAlert — saves a flagged ForensicLog entry and sends tamper alert.
 * Used for NOT_FOUND and REVOKED results (suspicious attempts).
 */
async function logAndAlert(payload: LogPayload): Promise<void> {
  await connectToDatabase();
  const geo = await resolveGeo(payload.ipAddress);

  await ForensicLogModel.create({
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
    timestamp: Date.now(),
    acknowledged: false,
  });

  await sendTamperAlert({
    hashSubmitted: payload.hashSubmitted,
    result: payload.result as "NOT_FOUND" | "REVOKED",
    ipAddress: payload.ipAddress,
    city: geo.city,
    country: geo.country,
    isp: geo.isp,
    browser: payload.browser,
    deviceType: payload.deviceType,
    operatingSystem: payload.operatingSystem,
    timestamp: Date.now(),
    certificateId: payload.certificateId,
  });
}

/**
 * logOnly — saves an unflagged ForensicLog entry for VALID verifications.
 * Provides the complete verification history for the Certificate Audit Trail (FR-17).
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
    timestamp: Date.now(),
    acknowledged: false,
  });
}
