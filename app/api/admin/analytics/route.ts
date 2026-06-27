import { NextResponse } from "next/server";
import { database } from "@/lib/database";

/**
 * GET /api/admin/analytics
 *
 * Super Admin (role=superadmin): full system analytics including
 *   Registry Admin activity breakdown.
 * Registry Admin (role=admin, wallet=0x...): their own stats only -
 *   certificates they issued, verifications of those certificates.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const wallet = url.searchParams.get("wallet");

    if (role === "admin" && wallet) {
      // Registry Admin: show only their own stats
      const myCerts = await database.getCertificatesByWallet(wallet);
      const allVerifications = await database.getVerifications();

      const myCertIds = new Set(myCerts.map((c) => c.id));
      const myVerifications = allVerifications.filter((v) => myCertIds.has(v.certificateId));

      const validCerts = myCerts.filter((c) => c.status === "valid");
      const revokedCerts = myCerts.filter((c) => c.status === "revoked");
      const distinctHolders = new Set(validCerts.map((c) => c.holderIdentityHash));

      const recentCertificates = [...myCerts]
        .sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime())
        .slice(0, 5);

      return NextResponse.json({
        totalCertificates: myCerts.length,
        validCertificates: validCerts.length,
        revokedCertificates: revokedCerts.length,
        totalVerifications: myVerifications.length,
        activeCertificateHolders: distinctHolders.size,
        recentCertificates,
        recentVerifications: myVerifications.slice(-10).reverse(),
        registryAdminActivity: null, // not shown to Registry Admins
      });
    }

    // Super Admin or no role: full system analytics
    const analytics = await database.getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
