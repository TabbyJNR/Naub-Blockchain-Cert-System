import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ idHash: string }> },
) {
  const { idHash } = await params;
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
}
