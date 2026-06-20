import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidReason, isValidTxHash, isValidBlockNumber, sanitizeString } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);

    // Up to 30 revocations per hour per IP — same bound as issuance.
    const rateLimit = await checkRateLimit(`revoke:${ip}`, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many revocation requests from this connection. Please wait a while and try again." },
        { status: 429 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, onChainTransactionHash, onChainBlockNumber } = body;

    // FR-09: a revocation reason is mandatory. The smart contract already
    // enforces this on-chain (EmptyRevocationReason), but the API must not
    // silently substitute a generic placeholder when none is supplied —
    // that would defeat the purpose of requiring one.
    if (!isValidReason(reason)) {
      return NextResponse.json(
        { error: "A revocation reason is required and must be under 1000 characters." },
        { status: 400 },
      );
    }
    const cleanReason = sanitizeString(reason, 1000);

    if (onChainTransactionHash !== undefined && !isValidTxHash(onChainTransactionHash)) {
      return NextResponse.json({ error: "Invalid onChainTransactionHash" }, { status: 400 });
    }
    if (onChainBlockNumber !== undefined && !isValidBlockNumber(onChainBlockNumber)) {
      return NextResponse.json({ error: "Invalid onChainBlockNumber" }, { status: 400 });
    }

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
        reason: cleanReason,
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
      revocationReason: cleanReason,
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
