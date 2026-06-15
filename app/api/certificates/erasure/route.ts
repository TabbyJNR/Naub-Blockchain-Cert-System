/**
 * NDPR Article 3.1(6) — Right to Erasure
 *
 * Deletes all personally identifiable data from the off-chain database
 * for the specified student. The on-chain hash record is not modified; it
 * remains as an anonymous mathematical value with no recoverable connection
 * to any identifiable person.
 */
import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function DELETE(request: Request) {
  try {
    const { matriculationNumber, dateOfBirth } = await request.json();

    if (!matriculationNumber || !dateOfBirth) {
      return NextResponse.json(
        { error: "matriculationNumber and dateOfBirth are required" },
        { status: 400 },
      );
    }

    const result = await database.erasePersonalData(matriculationNumber, dateOfBirth);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `${result.deleted} certificate record(s) erased. On-chain hash records remain as anonymous values.`,
    });
  } catch (error) {
    console.error("[Erasure API] Error:", error);
    return NextResponse.json({ error: "Failed to process erasure request" }, { status: 500 });
  }
}
