import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidHexHash } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ idHash: string }> },
) {
  try {
    const ip = getClientIp(request);

    // Up to 20 holder lookups per 5 minutes per IP — generous for a real
    // graduate checking their own records, tight enough to make brute-
    // force scanning for valid identity hashes impractical.
    const rateLimit = await checkRateLimit(`holder-lookup:${ip}`, 20, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many lookup requests from this connection. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    const { idHash } = await params;
    if (!isValidHexHash(idHash)) {
      return NextResponse.json({ certificates: [] });
    }

    const certificates = await database.getAllCertificates();

    // Return only public-safe fields — no personal data (NDPR compliance)
    const holderCertificates = certificates
      .filter((cert) => cert.holderIdentityHash === idHash)
      .map((cert) => ({
        id: cert.id,
        programmeOfStudy: cert.programmeOfStudy,
        classOfDegree: cert.classOfDegree,
        dateOfAward: cert.dateOfAward,
        status: cert.status,
        blockchainHash: cert.blockchainHash,
        ipfsCid: cert.ipfsCid,
        certificateNumber: cert.certificateNumber,
        institutionName: cert.institutionName,
        revocationReason: cert.revocationReason,
        revokedAt: cert.revokedAt,
      }));

    return NextResponse.json({ certificates: holderCertificates });
  } catch (error) {
    console.error("[Holder Lookup API] Error:", error);
    return NextResponse.json({ error: "Failed to look up certificates" }, { status: 500 });
  }
}
