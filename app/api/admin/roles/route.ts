import { NextResponse } from "next/server";

/**
 * Returns the current SUPER_ADMIN_WALLETS and REGISTRY_ADMIN_WALLETS
 * from environment variables, so the dashboard can display who currently
 * holds each role. The contract itself is the authoritative source, but
 * reading the env vars is fast and sufficient for the UI display.
 */
export async function GET() {
  const superAdminWallets = (process.env.SUPER_ADMIN_WALLETS || "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  const registryAdminWallets = (process.env.REGISTRY_ADMIN_WALLETS || "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  const contractAddress = process.env.CERTIFICATE_REGISTRY_ADDRESS || null;

  return NextResponse.json({
    superAdminWallets,
    registryAdminWallets,
    contractAddress,
  });
}
