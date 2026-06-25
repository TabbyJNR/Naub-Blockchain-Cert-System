import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find certificate by direct ID, blockchain hash, or certificate number
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

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Query the CertificateRegistry smart contract (via blockchain service)
    const blockchainRecord = await blockchain.verifyCertificateHash(
      certificate.blockchainHash,
    );

    if (!blockchainRecord) {
      return NextResponse.json(
        { error: "Certificate not found on blockchain" },
        { status: 404 },
      );
    }

    const blockchainResponse: Record<string, unknown> = {
      status: certificate.status === "revoked" ? "REVOKED" : "VALID",
      txHash: blockchainRecord.transactionHash,
      blockNumber: blockchainRecord.blockNumber,
      certificateHash: blockchainRecord.certificateHash,
      timestamp: blockchainRecord.timestamp,
    };

    if (certificate.status === "revoked") {
      blockchainResponse.revocationTxHash = certificate.revocationTxHash;
      blockchainResponse.revocationBlockNumber = certificate.revocationBlockNumber;
      blockchainResponse.revokedAt = certificate.revokedAt;
      blockchainResponse.revocationReason = certificate.revocationReason;
    }

    // Return public fields needed to render the formal NAUB certificate.
    // Note on NDPR: studentName and certificateNumber are printed on the
    // physical certificate itself - they are not additional disclosures.
    // Date of birth and matriculation number are intentionally excluded.
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
      // viceChancellor field is kept for display compatibility but the
      // formal certificate component uses the fixed letterhead constant
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
