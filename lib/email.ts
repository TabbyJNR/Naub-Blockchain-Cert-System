/**
 * Email notifications via Resend for the NAUB Blockchain Certificate System.
 *
 * Two email types are sent:
 *
 * 1. sendCertificateIssuanceEmail — sent to the student immediately after
 *    their certificate is successfully issued and anchored on-chain.
 *
 * 2. sendTamperAlert — sent to the Super Admin immediately when a suspicious
 *    verification attempt is detected (NOT_FOUND or REVOKED result).
 *    Satisfies NFR-11: alert delivery within 60 seconds of detection.
 *
 * Both fall back gracefully (log, do not throw) if RESEND_API_KEY is not
 * configured or the send fails — a notification failure must never block or
 * roll back any certificate operation.
 */

import type { Certificate } from "./database";
import { formatOrdinalDate, NAUB_VICE_CHANCELLOR_NAME } from "./certificate-utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BASE_URL =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "NAUB Certificate System <onboarding@resend.dev>";

// Super Admin email address — set in environment variables
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE ISSUANCE EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface SendCertificateEmailOptions {
  studentEmail: string;
  certificate: Certificate;
}

export async function sendCertificateIssuanceEmail(
  options: SendCertificateEmailOptions,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set - skipping certificate notification email");
    return;
  }

  const { studentEmail, certificate } = options;
  const verificationUrl = `${BASE_URL}/verify?id=${certificate.id}`;
  const ipfsUrl =
    certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-")
      ? `https://gateway.pinata.cloud/ipfs/${certificate.ipfsCid.replace("ipfs://", "")}`
      : null;
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${certificate.transactionHash}`;
  const dateOfAward = formatOrdinalDate(certificate.dateOfAward || certificate.dateIssued);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your NAUB Degree Certificate</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#7a1f1f;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;color:#f5d0d0;text-transform:uppercase;">Nigerian Army University Biu</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">
                Blockchain Certificate System
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1a1a1a;">
                Dear <strong>${certificate.studentName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.7;">
                Congratulations - your degree certificate has been officially issued and
                permanently anchored on the Ethereum Sepolia blockchain by the NAUB Registry.
                The details of your certificate are recorded below.
              </p>

              <!-- Certificate summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #7a1f1f;border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="background:#7a1f1f;padding:12px 16px;">
                    <p style="margin:0;font-size:11px;color:#ffffff;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">
                      Statement of Result - ${certificate.certificateNumber}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 16px;background:#fffdf9;">
                    <table width="100%" cellpadding="6" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#777;width:45%;">Graduate Name</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:bold;">${certificate.studentName}</td>
                      </tr>
                      <tr style="background:#f9f0f0;">
                        <td style="font-size:12px;color:#777;">Programme of Study</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:bold;">${certificate.programmeOfStudy}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#777;">Class of Degree</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:bold;">${certificate.classOfDegree}</td>
                      </tr>
                      <tr style="background:#f9f0f0;">
                        <td style="font-size:12px;color:#777;">Date of Award</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:bold;">${dateOfAward}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#777;">Vice Chancellor</td>
                        <td style="font-size:13px;color:#1a1a1a;">${NAUB_VICE_CHANCELLOR_NAME}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Verification section -->
              <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#1a1a1a;">
                How to verify your certificate
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#444;line-height:1.7;">
                Your certificate's authenticity can be verified by anyone - employers,
                NYSC, other institutions - using any of the methods below. No login or
                payment is required.
              </p>

              <!-- Verify button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#7a1f1f;border-radius:6px;">
                    <a href="${verificationUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;">
                      Verify Certificate Online →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Hash box -->
              <p style="margin:0 0 6px;font-size:12px;color:#777;font-weight:bold;">Certificate Hash (SHA-256)</p>
              <p style="margin:0 0 20px;font-size:11px;font-family:monospace;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;padding:10px;word-break:break-all;color:#333;">
                ${certificate.blockchainHash}
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#666;line-height:1.6;">
                This hash uniquely identifies your certificate on the blockchain. Paste it
                at <a href="${verificationUrl}" style="color:#7a1f1f;">${BASE_URL}/verify</a> to
                verify it instantly.
              </p>

              <!-- Etherscan link -->
              <p style="margin:0 0 6px;font-size:12px;color:#777;font-weight:bold;">Blockchain Transaction</p>
              <p style="margin:0 0 20px;">
                <a href="${etherscanUrl}" style="font-size:12px;color:#7a1f1f;font-family:monospace;word-break:break-all;">${certificate.transactionHash}</a>
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#666;line-height:1.6;">
                Click the transaction hash above to view your certificate's permanent
                record on Etherscan (Ethereum Sepolia blockchain explorer).
              </p>

              ${
                ipfsUrl
                  ? `<!-- IPFS PDF -->
              <p style="margin:0 0 6px;font-size:12px;color:#777;font-weight:bold;">Download Certificate PDF</p>
              <p style="margin:0 0 20px;">
                <a href="${ipfsUrl}" style="font-size:13px;color:#7a1f1f;font-weight:bold;">Download from IPFS (Pinata Gateway) →</a>
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#666;line-height:1.6;">
                Your certificate document is permanently stored on IPFS, a decentralised
                content-addressed storage network. The link above will always point to
                the same document - it cannot be altered or removed.
              </p>`
                  : ""
              }

              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                This email was sent automatically by the NAUB Blockchain Certificate System
                upon issuance of your degree certificate. If you believe this was sent in
                error, contact the NAUB Registrar's office.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f0f0;padding:16px 32px;text-align:center;border-top:1px solid #e0e0e0;">
              <p style="margin:0;font-size:11px;color:#999;">
                © 2026 Nigerian Army University Biu (NAUB) · Blockchain Certificate System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [studentEmail],
        subject: `Your NAUB Degree Certificate - ${certificate.certificateNumber}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Email] Resend send failed (${response.status}):`, errorText);
      if (FROM_ADDRESS.includes("onboarding@resend.dev")) {
        console.error(
          "[Email] Using Resend's shared test sender (onboarding@resend.dev) only " +
          "delivers to the email address you signed up to Resend with. To send to " +
          "real student emails, verify a domain at https://resend.com/domains and " +
          "set RESEND_FROM_ADDRESS to an address on that domain."
        );
      }
    } else {
      const data = await response.json();
      console.log(`[Email] Certificate notification sent successfully. ID: ${data.id}`);
    }
  } catch (error) {
    console.error("[Email] Failed to send certificate notification:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAMPER ALERT EMAIL  (NFR-11 — delivered within 60 seconds of detection)
// ─────────────────────────────────────────────────────────────────────────────

export interface TamperAlertOptions {
  hashSubmitted: string;
  result: "NOT_FOUND" | "REVOKED";
  ipAddress: string;
  city: string | null;
  country: string | null;
  isp: string | null;
  browser: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  timestamp: number;
  certificateId: string | null;
}

export async function sendTamperAlert(options: TamperAlertOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set - skipping tamper alert email");
    return;
  }
  if (!SUPER_ADMIN_EMAIL) {
    console.warn("[Email] SUPER_ADMIN_EMAIL not set - skipping tamper alert email");
    return;
  }

  const {
    hashSubmitted, result, ipAddress, city, country,
    isp, browser, deviceType, operatingSystem,
    timestamp, certificateId,
  } = options;

  const time = new Date(timestamp).toLocaleString("en-GB", {
    dateStyle: "full", timeStyle: "long", timeZone: "Africa/Lagos",
  });

  const location = [city, country].filter(Boolean).join(", ") || "Unknown location";
  const device = [browser, operatingSystem, deviceType].filter(Boolean).join(" · ") || "Unknown device";

  const resultLabel = result === "NOT_FOUND"
    ? "⛔ NOT FOUND — Certificate does not exist on blockchain"
    : "⚠️ REVOKED — A revoked certificate was submitted for verification";

  const resultColor = result === "NOT_FOUND" ? "#8B1A1A" : "#8B5E00";
  const resultBg = result === "NOT_FOUND" ? "#FDE8E8" : "#FFF8E6";

  const dashboardUrl = `${BASE_URL}/admin/dashboard`;
  const certUrl = certificateId ? `${BASE_URL}/admin/dashboard/certificate/${certificateId}` : null;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>⚠️ Tamper Alert — NAUB Certificate System</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#1B3A5C;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;color:#AABBD4;text-transform:uppercase;">NAUB Blockchain Certificate System</p>
              <h1 style="margin:8px 0 0;font-size:20px;color:#ffffff;font-weight:700;">
                ⚠️ Suspicious Verification Alert
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:#AABBD4;">
                Certificate Integrity Monitoring — CIMAS
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:${resultBg};border-left:4px solid ${resultColor};padding:16px 24px;">
              <p style="margin:0;font-size:13px;font-weight:bold;color:${resultColor};">${resultLabel}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#555;">
                A suspicious certificate verification attempt was detected and logged.
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:bold;color:#1B3A5C;">
                Incident Details
              </p>
              <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;font-size:13px;">
                <tr style="background:#EEF2F8;">
                  <td style="color:#555;width:40%;padding:10px 12px;">Time of Attempt</td>
                  <td style="color:#1a1a1a;font-weight:bold;padding:10px 12px;">${time}</td>
                </tr>
                <tr>
                  <td style="color:#555;padding:10px 12px;">Result Returned</td>
                  <td style="color:${resultColor};font-weight:bold;padding:10px 12px;">${result}</td>
                </tr>
                <tr style="background:#EEF2F8;">
                  <td style="color:#555;padding:10px 12px;">IP Address</td>
                  <td style="color:#1a1a1a;font-family:monospace;padding:10px 12px;">${ipAddress}</td>
                </tr>
                <tr>
                  <td style="color:#555;padding:10px 12px;">Location</td>
                  <td style="color:#1a1a1a;padding:10px 12px;">${location}</td>
                </tr>
                <tr style="background:#EEF2F8;">
                  <td style="color:#555;padding:10px 12px;">ISP / Network</td>
                  <td style="color:#1a1a1a;padding:10px 12px;">${isp || "Unknown"}</td>
                </tr>
                <tr>
                  <td style="color:#555;padding:10px 12px;">Device / Browser</td>
                  <td style="color:#1a1a1a;padding:10px 12px;">${device}</td>
                </tr>
                <tr style="background:#EEF2F8;">
                  <td style="color:#555;padding:10px 12px;">Hash Submitted</td>
                  <td style="color:#1a1a1a;font-family:monospace;font-size:11px;word-break:break-all;padding:10px 12px;">${hashSubmitted}</td>
                </tr>
                ${certificateId ? `
                <tr>
                  <td style="color:#555;padding:10px 12px;">Certificate ID</td>
                  <td style="color:#1a1a1a;font-family:monospace;font-size:11px;padding:10px 12px;">${certificateId}</td>
                </tr>` : ""}
              </table>

              <!-- Actions -->
              <p style="margin:24px 0 12px;font-size:14px;font-weight:bold;color:#1B3A5C;">
                Recommended Actions
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:#1B3A5C;border-radius:6px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:10px 24px;font-size:13px;color:#ffffff;text-decoration:none;font-weight:bold;">
                      Open Super Admin Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              ${certUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#E6F4ED;border:1px solid #1E5C3A;border-radius:6px;">
                    <a href="${certUrl}" style="display:inline-block;padding:10px 24px;font-size:13px;color:#1E5C3A;text-decoration:none;font-weight:bold;">
                      View Certificate Audit Trail →
                    </a>
                  </td>
                </tr>
              </table>` : ""}

              <p style="margin:16px 0 0;font-size:12px;color:#666;line-height:1.7;">
                This incident has been automatically logged in the NAUB Forensic Log.
                If you believe this represents a genuine forgery attempt, log in to the
                Super Admin Panel to review the full audit trail and take appropriate action.
                Evidence from this log can be submitted to the EFCC or ICPC if required.
              </p>

              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
                This alert was generated automatically by the NAUB Certificate Integrity
                Monitoring and Alert Service (CIMAS). You are receiving this because your
                address is registered as the Super Admin notification email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#EEF2F8;padding:14px 32px;text-align:center;border-top:1px solid #e0e0e0;">
              <p style="margin:0;font-size:11px;color:#999;">
                © 2026 Nigerian Army University Biu (NAUB) · Blockchain Certificate System · CIMAS
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [SUPER_ADMIN_EMAIL],
        subject: `⚠️ NAUB Certificate Alert: Suspicious ${result} attempt detected`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Email] Tamper alert send failed (${response.status}):`, errorText);
    } else {
      const data = await response.json();
      console.log(`[Email] Tamper alert sent to Super Admin. ID: ${data.id}`);
    }
  } catch (error) {
    console.error("[Email] Failed to send tamper alert:", error);
  }
}
