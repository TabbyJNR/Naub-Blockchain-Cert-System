import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { blockchain } from "@/lib/blockchain";
import { generateCertificateId, canonicalCertificatePayload, canonicalHolderPayload } from "@/lib/certificate-utils";
import type { Certificate } from "@/lib/database";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isNonEmptyString,
  isValidDateString,
  isValidOptionalString,
  isValidHexHash,
  isValidTxHash,
  isValidBlockNumber,
  sanitizeString,
} from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Up to 30 issuance attempts per hour per IP. Generous enough for
    // genuine batch-issuance sessions, tight enough to block spam/abuse.
    const rateLimit = await checkRateLimit(`issue:${ip}`, 30, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many issuance requests from this connection. Please wait a while and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      studentName,
      matriculationNumber,
      dateOfBirth,
      programmeOfStudy,
      classOfDegree,
      dateOfAward,
      certificateNumber,
      ipfsCid,
      institutionName = "Nigerian Army University Biu",
      certificateType = "DEGREE",
      certificateHash,
      holderIdentityHash,
      onChainTransactionHash,
      onChainBlockNumber,
    } = body;

    // Vice Chancellor is a fixed institutional constant — not submitted
    // from the form, so it is always consistent across all certificates.
    const viceChancellor = "Professor Lawan Bala Buratai";

    // ---- Input validation -------------------------------------------------
    // Every field here can end up hashed and permanently anchored on the
    // Ethereum Sepolia blockchain, so each is checked for presence, type,
    // and a sane length before anything else happens.
    const validationErrors: string[] = [];
    if (!isNonEmptyString(studentName)) validationErrors.push("studentName");
    if (!isNonEmptyString(matriculationNumber)) validationErrors.push("matriculationNumber");
    if (!isValidDateString(dateOfBirth)) validationErrors.push("dateOfBirth");
    if (!isNonEmptyString(programmeOfStudy)) validationErrors.push("programmeOfStudy");
    if (!isNonEmptyString(classOfDegree)) validationErrors.push("classOfDegree");
    if (!isValidDateString(dateOfAward)) validationErrors.push("dateOfAward");
    if (!isNonEmptyString(certificateNumber)) validationErrors.push("certificateNumber");
    if (!isValidOptionalString(ipfsCid, 300)) validationErrors.push("ipfsCid");
    if (certificateHash !== undefined && !isValidHexHash(certificateHash)) validationErrors.push("certificateHash");
    if (holderIdentityHash !== undefined && !isValidHexHash(holderIdentityHash)) validationErrors.push("holderIdentityHash");
    if (onChainTransactionHash !== undefined && !isValidTxHash(onChainTransactionHash)) validationErrors.push("onChainTransactionHash");
    if (onChainBlockNumber !== undefined && !isValidBlockNumber(onChainBlockNumber)) validationErrors.push("onChainBlockNumber");

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: `Invalid or missing field(s): ${validationErrors.join(", ")}` },
        { status: 400 },
      );
    }

    const cleanStudentName = sanitizeString(studentName);
    const cleanMatriculationNumber = sanitizeString(matriculationNumber);
    const cleanProgrammeOfStudy = sanitizeString(programmeOfStudy, 300);
    const cleanClassOfDegree = sanitizeString(classOfDegree);
    const cleanCertificateNumber = sanitizeString(certificateNumber);

    // ---- Uniqueness check (defense in depth) -------------------------------
    // The frontend already runs this check before requesting a MetaMask
    // transaction (see /api/certificates/check-duplicate), but it is
    // enforced again here in case that pre-flight step was ever bypassed.
    // This is NOT something the smart contract alone can catch: the
    // on-chain hash is a hash of ALL eight fields combined, so two
    // genuinely different certificates that happen to reuse the same
    // matriculation number or certificate number would still produce
    // different hashes and would NOT be rejected by issueCertificate().
    const duplicate = await database.findDuplicateIdentifiers(cleanMatriculationNumber, cleanCertificateNumber);
    if (duplicate) {
      const fieldLabel =
        duplicate.field === "matriculationNumber" ? "Matriculation number" : "Certificate number (Ref. No)";
      return NextResponse.json(
        {
          error: `${fieldLabel} is already in use by an existing certificate (${duplicate.existingCertificateId}). Each student's matriculation number and each certificate's Ref. No must be unique.`,
        },
        { status: 409 },
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
              studentName: cleanStudentName,
              matriculationNumber: cleanMatriculationNumber,
              dateOfBirth,
              programmeOfStudy: cleanProgrammeOfStudy,
              classOfDegree: cleanClassOfDegree,
              dateOfAward,
              certificateNumber: cleanCertificateNumber,
              viceChancellor,
            })
          )
          .digest("hex");

    // Derive holderIdentityHash if not supplied by client
    const finalHolderHash =
      holderIdentityHash ||
      crypto
        .createHash("sha256")
        .update(canonicalHolderPayload(cleanStudentName, dateOfBirth))
        .digest("hex");

    let transactionHash: string;
    let blockNumber: number;

    const coercedBlockNumber =
      onChainBlockNumber !== undefined && onChainBlockNumber !== null
        ? Number(onChainBlockNumber)
        : undefined;

    if (onChainTransactionHash && coercedBlockNumber !== undefined && Number.isInteger(coercedBlockNumber)) {
      // The browser already submitted and confirmed the transaction directly
      // via the Registry Admin's own MetaMask wallet. Record the real result.
      transactionHash = onChainTransactionHash;
      blockNumber = coercedBlockNumber;

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
      studentName: cleanStudentName,
      matriculationNumber: cleanMatriculationNumber,
      dateOfBirth,
      programmeOfStudy: cleanProgrammeOfStudy,
      classOfDegree: cleanClassOfDegree,
      dateOfAward,
      certificateNumber: cleanCertificateNumber,
      viceChancellor,
      holderIdentityHash: finalHolderHash,
      ipfsCid: ipfsCid || `ipfs://demo-${certificateId}`,
      institutionName: sanitizeString(institutionName, 300),
      certificateType: sanitizeString(certificateType, 100),
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
