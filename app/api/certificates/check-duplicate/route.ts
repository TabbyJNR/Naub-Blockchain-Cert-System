import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { isNonEmptyString } from "@/lib/validation";

/**
 * Pre-flight duplicate check for unique student/certificate identifiers.
 *
 * Called by the Issue Certificate form BEFORE requesting a MetaMask
 * transaction, so a Registry Admin is never asked to pay real Sepolia
 * gas for an issuance that would be rejected anyway. The same check is
 * also enforced again inside POST /api/certificates/issue as defense
 * in depth, in case this pre-flight step is ever bypassed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { matriculationNumber, certificateNumber } = body;

    if (!isNonEmptyString(matriculationNumber) || !isNonEmptyString(certificateNumber)) {
      return NextResponse.json(
        { error: "matriculationNumber and certificateNumber are required" },
        { status: 400 },
      );
    }

    const duplicate = await database.findDuplicateIdentifiers(
      matriculationNumber,
      certificateNumber,
    );

    if (duplicate) {
      const fieldLabel =
        duplicate.field === "matriculationNumber" ? "Matriculation number" : "Certificate number (Ref. No)";
      return NextResponse.json(
        {
          duplicate: true,
          field: duplicate.field,
          message: `${fieldLabel} is already in use by an existing certificate (${duplicate.existingCertificateId}). Each student's matriculation number and each certificate's Ref. No must be unique.`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error("[Duplicate Check API] Error:", error);
    return NextResponse.json({ error: "Failed to check for duplicates" }, { status: 500 });
  }
}
