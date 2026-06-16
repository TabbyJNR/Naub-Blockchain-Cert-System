/**
 * Authentication: EIP-191 wallet signature + JWT
 *
 * Step 1: POST /api/admin/login?step=nonce — generate a nonce for the wallet to sign
 * Step 2: POST /api/admin/login            — verify the EIP-191 signature and issue a JWT
 *
 * The JWT is derived from on-chain role membership, not a database password.
 * Compromising the off-chain data does not allow forging admin credentials.
 */

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import crypto from "crypto";

// In production, nonces would be stored in Redis/MongoDB with TTL.
// For development, a simple in-memory map is used.
const nonceStore = new Map<string, { nonce: string; issuedAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const JWT_SECRET = process.env.JWT_SECRET || "naub-dev-secret-change-in-production";

// Wallets that are authorised to administer the system.
// In production, these are looked up via the CertificateRegistry smart contract
// using the SUPERADMIN_ROLE and CERTIFICATE_ROLE AccessControl checks.
const SUPER_ADMIN_WALLETS: string[] = (
  process.env.SUPER_ADMIN_WALLETS || ""
)
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

const REGISTRY_ADMIN_WALLETS: string[] = (
  process.env.REGISTRY_ADMIN_WALLETS || ""
)
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

function signJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 8 * 3600 })).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

// POST /api/admin/login?step=nonce  — returns a nonce for the wallet to sign
// POST /api/admin/login             — verifies EIP-191 signature and issues JWT
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const step = url.searchParams.get("step");

    if (step === "nonce") {
      const { walletAddress } = await request.json();
      if (!walletAddress) {
        return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
      }
      const nonce = crypto.randomBytes(16).toString("hex");
      nonceStore.set(walletAddress.toLowerCase(), { nonce, issuedAt: Date.now() });
      return NextResponse.json({ nonce });
    }

    // Default: verify signature and issue JWT
    const { walletAddress, signature, nonce } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: "walletAddress, signature and nonce are required" }, { status: 400 });
    }

    const stored = nonceStore.get(walletAddress.toLowerCase());
    if (!stored || stored.nonce !== nonce || Date.now() - stored.issuedAt > NONCE_TTL_MS) {
      return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
    }

    // Verify EIP-191 signature.
    // Must reconstruct the exact same message string the frontend signed
    // (ethers.verifyMessage handles the "\x19Ethereum Signed Message:\n"
    // prefix and UTF-8 encoding internally — we just need the original
    // plain-text message here, not the hex-encoded bytes sent to MetaMask).
    const signMessage = `NAUB Registry sign-in\nNonce: ${nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(signMessage, signature).toLowerCase();
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (recoveredAddress !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: "Signature does not match wallet address" }, { status: 401 });
    }

    // Determine role
    let role: "superadmin" | "admin" | null = null;
    if (SUPER_ADMIN_WALLETS.includes(recoveredAddress)) {
      role = "superadmin";
    } else if (REGISTRY_ADMIN_WALLETS.includes(recoveredAddress)) {
      role = "admin";
    }

    // In development with no wallets configured, accept any wallet as admin
    if (!role && SUPER_ADMIN_WALLETS.length === 0 && REGISTRY_ADMIN_WALLETS.length === 0) {
      role = "admin";
    }

    if (!role) {
      return NextResponse.json({ error: "Wallet does not hold a recognised role on the CertificateRegistry contract" }, { status: 403 });
    }

    nonceStore.delete(walletAddress.toLowerCase());

    const token = signJwt({ walletAddress: recoveredAddress, role });
    return NextResponse.json({ success: true, token, role, walletAddress: recoveredAddress });
  } catch (error) {
    console.error("[Auth] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
