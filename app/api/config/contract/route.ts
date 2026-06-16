import { NextResponse } from "next/server";

/**
 * Exposes the deployed CertificateRegistry contract address to the browser.
 * The contract address is public information (visible to anyone on
 * Etherscan), so there is no security concern in returning it here.
 *
 * Returns contractAddress: null when no contract is configured yet,
 * in which case the frontend should fall back to the legacy
 * server-signed simulation path.
 */
export async function GET() {
  const contractAddress = process.env.CERTIFICATE_REGISTRY_ADDRESS || null;
  return NextResponse.json({ contractAddress });
}
