import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason || "Certificate revoked by NAUB Registry";

    const certificate = await database.getCertificate(id);
    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (certificate.status === "revoked") {
      return NextResponse.json({ error: "Certificate is already revoked" }, { status: 400 });
    }

    // Record revocation on blockchain
    const revocationData = JSON.stringify({
      action: "REVOKE",
      certificateId: id,
      originalHash: certificate.blockchainHash,
      revokedAt: new Date().toISOString(),
      reason,
    });

    const blockchainRecord = await blockchain.writeCertificateHash(revocationData);

    const updated = await database.updateCertificate(id, {
      status: "revoked",
      revocationTxHash: blockchainRecord.transactionHash,
      revocationBlockNumber: blockchainRecord.blockNumber,
      revokedAt: new Date().toISOString(),
      revocationReason: reason,
    });

    return NextResponse.json({
      success: true,
      certificate: updated,
      blockchain: {
        revocationTxHash: blockchainRecord.transactionHash,
        revocationBlockNumber: blockchainRecord.blockNumber,
      },
    });
  } catch (error) {
    console.error(`[Revoke API] Error:`, error);
    return NextResponse.json(
      { error: "Failed to revoke certificate" },
      { status: 500 }
    );
  }
}
