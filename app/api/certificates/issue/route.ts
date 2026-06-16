import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";
import { generateCertificateId, canonicalCertificatePayload, canonicalHolderPayload } from "@/lib/certificate-utils";
import type { Certificate } from "@/lib/database";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName,
      matriculationNumber,
      dateOfBirth,
      programmeOfStudy,
      classOfDegree,
      dateOfAward,
      certificateNumber,
      viceChancellor,
      ipfsCid,
      institutionName = "Nigerian Army University Biu",
      certificateType = "DEGREE",
      certificateHash,    // SHA-256 hash computed in browser via Web Crypto API
      holderIdentityHash, // SHA-256 hash of studentName + dateOfBirth (NDPR-safe)
      // If the browser already submitted the transaction directly to the
      // CertificateRegistry contract via MetaMask, these are supplied so
      // the backend records the real result instead of writing its own.
      onChainTransactionHash,
      onChainBlockNumber,
    } = body;

    // Validate all eight required certificate fields
    if (
      !studentName ||
      !matriculationNumber ||
      !dateOfBirth ||
      !programmeOfStudy ||
      !classOfDegree ||
      !dateOfAward ||
      !certificateNumber ||
      !viceChancellor
    ) {
      return NextResponse.json(
        { error: "Missing required fields: studentName, matriculationNumber, dateOfBirth, programmeOfStudy, classOfDegree, dateOfAward, certificateNumber, viceChancellor" },
        { status: 400 }
      );
    }

    const certificateId = generateCertificateId();
    const dateIssued = new Date().toISOString().split("T")[0];

    // If the browser did not send a pre-computed hash, generate it server-side
    const finalCertHash =
      certificateHash ||
      "0x" +
        crypto
          .createHash("sha256")
          .update(
            canonicalCertificatePayload({
              studentName,
              matriculationNumber,
              dateOfBirth,
              programmeOfStudy,
              classOfDegree,
              dateOfAward,
              certificateNumber,
              viceChancellor,
            })
          )
          .digest("hex");

    // Derive holderIdentityHash if not supplied by client
    const finalHolderHash =
      holderIdentityHash ||
      crypto
        .createHash("sha256")
        .update(canonicalHolderPayload(studentName, dateOfBirth))
        .digest("hex");

    let transactionHash: string;
    let blockNumber: number;

    if (onChainTransactionHash && typeof onChainBlockNumber === "number") {
      // The browser already submitted and confirmed the transaction directly
      // via the Registry Admin's own MetaMask wallet. Record the real result.
      transactionHash = onChainTransactionHash;
      blockNumber = onChainBlockNumber;

      // Keep the local cache in sync for fast verification lookups.
      try {
        await blockchain.recordConfirmedTransaction(finalCertHash, transactionHash, blockNumber);
      } catch (cacheError) {
        console.error("[API] Failed to cache confirmed transaction:", cacheError);
      }
    } else {
      // Fallback path (no contract configured / no wallet transaction
      // supplied): server signs and submits, or simulates.
      let blockchainRecord;
      try {
        blockchainRecord = await blockchain.writeCertificateHash(
          finalCertHash,
          finalHolderHash,
          ipfsCid
        );
      } catch (blockchainError) {
        console.error(`[API] Blockchain error:`, blockchainError);
        blockchainRecord = {
          transactionHash: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
          timestamp: Date.now(),
          certificateHash: finalCertHash,
        };
      }
      transactionHash = blockchainRecord.transactionHash;
      blockNumber = blockchainRecord.blockNumber;
    }

    const certificate: Certificate = {
      id: certificateId,
      studentName,
      matriculationNumber,
      dateOfBirth,
      programmeOfStudy,
      classOfDegree,
      dateOfAward,
      certificateNumber,
      viceChancellor,
      holderIdentityHash: finalHolderHash,
      ipfsCid: ipfsCid || `ipfs://demo-${certificateId}`,
      institutionName,
      certificateType,
      dateIssued,
      status: "valid",
      blockchainHash: finalCertHash,
      transactionHash,
      blockNumber,
    };

    await database.createCertificate(certificate);

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    console.error("[API] Error issuing certificate:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue certificate" },
      { status: 500 }
    );
  }
}
