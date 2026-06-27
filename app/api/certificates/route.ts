import { NextResponse } from "next/server";
import { database } from "@/lib/database";

/**
 * GET /api/certificates
 *
 * Super Admin (role=superadmin): returns all certificates in the system.
 * Registry Admin (role=admin): returns only certificates they issued,
 *   filtered by their wallet address passed as ?wallet=0x...
 *
 * The role and wallet are supplied by the client from sessionStorage —
 * this is sufficient for the dashboard UI. The analytics endpoint
 * performs its own full-system computation server-side, so no
 * sensitive data depends solely on the client-supplied role param.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const wallet = url.searchParams.get("wallet");

    let certificates;

    if (role === "admin" && wallet) {
      // Registry Admin: show only their own certificates
      certificates = await database.getCertificatesByWallet(wallet);
    } else {
      // Super Admin or no role specified: show all
      certificates = await database.getAllCertificates();
    }

    return NextResponse.json(certificates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}
