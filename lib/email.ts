/**
 * Certificate issuance notification email via Resend.
 *
 * Sent to the student's email address immediately after their certificate
 * is successfully issued and anchored on-chain. Contains everything the
 * graduate needs to verify, share, and download their certificate:
 * - The four printed certificate fields
 * - The certificate hash (for verification)
 * - The certificate number / Ref. No
 * - A direct verification link
 * - A link to the IPFS PDF (if available)
 * - Instructions on how to use each item
 *
 * Falls back gracefully (logs, does not throw) if RESEND_API_KEY is not
 * configured or the send fails - a notification failure must never block
 * or roll back a certificate that has already been anchored on-chain.
 */

import type { Certificate } from "./database";
import { formatOrdinalDate, NAUB_VICE_CHANCELLOR_NAME } from "./certificate-utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BASE_URL =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

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

  const fromAddress = process.env.RESEND_FROM_ADDRESS || "NAUB Certificate System <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [studentEmail],
        subject: `Your NAUB Degree Certificate - ${certificate.certificateNumber}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Email] Resend send failed (${response.status}):`, errorText);
      if (fromAddress.includes("onboarding@resend.dev")) {
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
