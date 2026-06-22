import { NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { uploadToIpfs } from "@/lib/ipfs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isNonEmptyString, isValidDateString, sanitizeString } from "@/lib/validation";

/**
 * Generates the certificate PDF and uploads it to IPFS BEFORE the
 * on-chain transaction is requested, so the IPFS CID can be included in
 * the issueCertificate() call itself — keeping the on-chain record and
 * the actual pinned document consistent. (Generating the PDF only after
 * the transaction confirms, as a first pass of this feature did, would
 * mean the on-chain ipfsCid field never matches the real uploaded file.)
 *
 * Returns a placeholder CID (not an error) if Pinata is not configured
 * or the upload fails, so a missing/misconfigured IPFS integration
 * never blocks certificate issuance.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`prepare-ipfs:${ip}`, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests from this connection. Please wait a while and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { studentName, programmeOfStudy, classOfDegree, dateOfAward, certificateNumber } = body;

    if (
      !isNonEmptyString(studentName) ||
      !isNonEmptyString(programmeOfStudy) ||
      !isNonEmptyString(classOfDegree) ||
      !isValidDateString(dateOfAward) ||
      !isNonEmptyString(certificateNumber)
    ) {
      return NextResponse.json({ error: "Missing or invalid certificate fields" }, { status: 400 });
    }

    const cleanFields = {
      studentName: sanitizeString(studentName),
      programmeOfStudy: sanitizeString(programmeOfStudy, 300),
      classOfDegree: sanitizeString(classOfDegree),
      dateOfAward,
      certificateNumber: sanitizeString(certificateNumber),
    };

    try {
      const pdfBytes = await generateCertificatePdf(cleanFields);
      const uploadResult = await uploadToIpfs(
        pdfBytes,
        `${cleanFields.certificateNumber.replace(/\//g, "-")}.pdf`,
      );

      if (uploadResult) {
        return NextResponse.json({
          ipfsCid: `ipfs://${uploadResult.cid}`,
          gatewayUrl: uploadResult.gatewayUrl,
        });
      }
    } catch (genError) {
      console.error("[Prepare IPFS API] PDF generation/upload failed:", genError);
    }

    // Pinata not configured, or generation/upload failed — fall back to
    // no CID rather than blocking issuance. The issue route applies its
    // own placeholder in this case.
    return NextResponse.json({ ipfsCid: null });
  } catch (error) {
    console.error("[Prepare IPFS API] Error:", error);
    return NextResponse.json({ ipfsCid: null });
  }
}
