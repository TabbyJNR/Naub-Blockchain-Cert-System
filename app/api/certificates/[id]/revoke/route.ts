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
    const { onChainTransactionHash, onChainBlockNumber } = body;

    const certificate = await database.getCertificate(id);
    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (certificate.status === "revoked") {
      return NextResponse.json({ error: "Certificate is already revoked" }, { status: 400 });
    }

    let revocationTxHash: string;
    let revocationBlockNumber: number;

    if (onChainTransactionHash && typeof onChainBlockNumber === "number") {
      // The browser already submitted and confirmed revokeCertificate()
      // directly via the Registry Admin's own MetaMask wallet.
      revocationTxHash = onChainTransactionHash;
      revocationBlockNumber = onChainBlockNumber;
    } else {
      // Fallback path: server signs and submits, or simulates.
      const revocationData = JSON.stringify({
        action: "REVOKE",
        certificateId: id,
        originalHash: certificate.blockchainHash,
        revokedAt: new Date().toISOString(),
        reason,
      });
      const blockchainRecord = await blockchain.writeCertificateHash(revocationData);
      revocationTxHash = blockchainRecord.transactionHash;
      revocationBlockNumber = blockchainRecord.blockNumber;
    }

    const updated = await database.updateCertificate(id, {
      status: "revoked",
      revocationTxHash,
      revocationBlockNumber,
      revokedAt: new Date().toISOString(),
      revocationReason: reason,
    });

    return NextResponse.json({
      success: true,
      certificate: updated,
      blockchain: {
        revocationTxHash,
        revocationBlockNumber,
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
