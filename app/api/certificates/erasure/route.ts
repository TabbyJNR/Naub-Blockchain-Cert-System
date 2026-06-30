/**
 * NDPR Article 3.1(6) - Right to Erasure
 *
 * Permanently clears personally identifiable fields (student name, date
 * of birth, matriculation number) from the certificate record in MongoDB.
 * The certificate record itself is NOT deleted - its verification-relevant
 * fields (blockchainHash, transactionHash, certificateNumber,
 * programmeOfStudy, classOfDegree, dateOfAward, status) remain intact, so
 * the certificate continues to verify successfully on the public /verify
 * page and on Etherscan after erasure. Only name-based lookup via the
 * Holder Portal stops working, which is the intended effect.
 *
 * This is a destructive, irreversible operation, so it is both validated
 * and rate-limited more tightly than read-only endpoints.
 */
import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isNonEmptyString, isValidDateString } from "@/lib/validation";

export async function DELETE(request: Request) {
  try {
    const ip = getClientIp(request);

    // Up to 5 erasure requests per hour per IP - deliberately tight,
    // since this is a destructive, irreversible operation.
    const rateLimit = await checkRateLimit(`erasure:${ip}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many erasure requests from this connection. Please wait a while and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { matriculationNumber, dateOfBirth } = body;

    if (!isNonEmptyString(matriculationNumber) || !isValidDateString(dateOfBirth)) {
      return NextResponse.json(
        { error: "A valid matriculationNumber and dateOfBirth are required" },
        { status: 400 },
      );
    }

    const result = await database.erasePersonalData(matriculationNumber.trim(), dateOfBirth);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `Personal data cleared for ${result.deleted} certificate record(s). The certificate(s) remain verifiable by hash or certificate number - only name/date-of-birth lookup (Holder Portal) is now disabled for these records. The on-chain hash remains unchanged, as an anonymous value.`,
    });
  } catch (error) {
    console.error("[Erasure API] Error:", error);
    return NextResponse.json({ error: "Failed to process erasure request" }, { status: 500 });
  }
}
