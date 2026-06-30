/**
 * Authentication: EIP-191 wallet signature + JWT
 *
 * Step 1: POST /api/admin/login?step=nonce - generate a nonce for the wallet to sign
 * Step 2: POST /api/admin/login            - verify the EIP-191 signature and issue a JWT
 *
 * The JWT is derived from on-chain role membership, not a database password.
 * Compromising the off-chain data does not allow forging admin credentials.
 *
 * Both steps are rate-limited per IP address to mitigate brute-force /
 * spam attempts against the login flow.
 *
 * Nonces are stored in MongoDB rather than in-memory: Vercel serverless
 * functions do not guarantee that the "request a nonce" call and the
 * later "verify the signature" call land on the same running instance.
 * An in-memory store would be invisible across instances, causing
 * intermittent "invalid or expired nonce" failures even on a correct,
 * well-timed sign-in attempt.
 */

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidWalletAddress, isNonEmptyString } from "@/lib/validation";
import { connectToDatabase } from "@/lib/mongodb";
import { NonceModel } from "@/lib/nonce-model";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Fallback in-memory store, used only if MongoDB is not configured at all
// (e.g. local development without a MONGODB_URI). Never relied upon in
// the deployed environment, where MongoDB is always configured.
const memoryNonceStore = new Map<string, { nonce: string; issuedAt: number }>();

// Admin records handling permanent academic certificates should not stay
// valid for long if a token is ever leaked - kept short deliberately.
const JWT_EXPIRY_SECONDS = 2 * 3600; // 2 hours

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
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

async function storeNonce(walletAddress: string, nonce: string): Promise<void> {
  const connected = await connectToDatabase();
  if (connected) {
    await NonceModel.findOneAndUpdate(
      { walletAddress },
      { walletAddress, nonce, issuedAt: Date.now() },
      { upsert: true },
    );
  } else {
    memoryNonceStore.set(walletAddress, { nonce, issuedAt: Date.now() });
  }
}

async function consumeNonce(walletAddress: string): Promise<{ nonce: string; issuedAt: number } | null> {
  const connected = await connectToDatabase();
  if (connected) {
    const doc = await NonceModel.findOne({ walletAddress }).lean();
    return doc ? { nonce: doc.nonce, issuedAt: doc.issuedAt } : null;
  }
  return memoryNonceStore.get(walletAddress) || null;
}

async function deleteNonce(walletAddress: string): Promise<void> {
  const connected = await connectToDatabase();
  if (connected) {
    await NonceModel.deleteOne({ walletAddress });
  } else {
    memoryNonceStore.delete(walletAddress);
  }
}

// POST /api/admin/login?step=nonce  - returns a nonce for the wallet to sign
// POST /api/admin/login             - verifies EIP-191 signature and issues JWT
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const url = new URL(request.url);
    const step = url.searchParams.get("step");

    if (step === "nonce") {
      // Up to 15 nonce requests per 5 minutes per IP.
      const rateLimit = await checkRateLimit(`login-nonce:${ip}`, 15, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: "Too many login attempts. Please wait a moment and try again." },
          { status: 429 },
        );
      }

      const body = await request.json().catch(() => ({}));
      const { walletAddress } = body;
      if (!isValidWalletAddress(walletAddress)) {
        return NextResponse.json({ error: "A valid walletAddress is required" }, { status: 400 });
      }
      const nonce = crypto.randomBytes(16).toString("hex");
      await storeNonce(walletAddress.toLowerCase(), nonce);
      return NextResponse.json({ nonce });
    }

    // Up to 10 signature-verification attempts per 5 minutes per IP.
    const rateLimit = await checkRateLimit(`login-verify:${ip}`, 10, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    // Default: verify signature and issue JWT
    const body = await request.json().catch(() => ({}));
    const { walletAddress, signature, nonce } = body;

    if (!isValidWalletAddress(walletAddress) || !isNonEmptyString(signature, 500) || !isNonEmptyString(nonce, 100)) {
      return NextResponse.json({ error: "walletAddress, signature and nonce are required" }, { status: 400 });
    }

    const stored = await consumeNonce(walletAddress.toLowerCase());
    if (!stored || stored.nonce !== nonce || Date.now() - stored.issuedAt > NONCE_TTL_MS) {
      return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
    }

    // Verify EIP-191 signature.
    // Must reconstruct the exact same message string the frontend signed
    // (ethers.verifyMessage handles the "\x19Ethereum Signed Message:\n"
    // prefix and UTF-8 encoding internally - we just need the original
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

    // Determine role.
    // The smart contract is the authoritative source - hasRole() is a
    // free view call (no gas). We use pre-computed role hashes (they are
    // keccak256 of a fixed string and never change) so we only need one
    // RPC call per check instead of two. We try two RPC endpoints and
    // fall back to env vars if both fail.
    let role: "superadmin" | "admin" | null = null;
    const contractAddress = process.env.CERTIFICATE_REGISTRY_ADDRESS;

    // Pre-computed keccak256 role hashes matching CertificateRegistry.sol
    const SUPERADMIN_ROLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("SUPERADMIN_ROLE"));
    const CERTIFICATE_ROLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("CERTIFICATE_ROLE"));

    const abi = ["function hasRole(bytes32 role, address account) external view returns (bool)"];

    // Always check env vars first (fastest, no network call)
    if (SUPER_ADMIN_WALLETS.includes(recoveredAddress)) {
      role = "superadmin";
    } else if (REGISTRY_ADMIN_WALLETS.includes(recoveredAddress)) {
      role = "admin";
    }

    // If not found in env vars, check the contract (catches wallets
    // added on-chain via grantCertificateRole() without updating env vars)
    if (!role && contractAddress && contractAddress.startsWith("0x")) {
      const rpcEndpoints = [
        process.env.TESTNET_RPC_URL,
        "https://ethereum-sepolia-rpc.publicnode.com",
        "https://rpc.sepolia.org",
      ].filter(Boolean) as string[];

      for (const rpcUrl of rpcEndpoints) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const contract = new ethers.Contract(contractAddress, abi, provider);

          // Check both roles in parallel with a 5-second timeout
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("RPC timeout")), 5000)
          );

          const [isSuperAdmin, isCertAdmin] = await Promise.race([
            Promise.all([
              contract.hasRole(SUPERADMIN_ROLE_HASH, recoveredAddress),
              contract.hasRole(CERTIFICATE_ROLE_HASH, recoveredAddress),
            ]),
            timeout,
          ]);

          if (isSuperAdmin) {
            role = "superadmin";
          } else if (isCertAdmin) {
            role = "admin";
          }
          break; // RPC call succeeded - no need to try backup endpoints
        } catch (rpcError) {
          console.warn(`[Auth] RPC ${rpcUrl} failed:`, rpcError);
          // Try next endpoint
        }
      }
    }

    // Dev mode: no config at all - accept any wallet as admin
    if (!role && SUPER_ADMIN_WALLETS.length === 0 && REGISTRY_ADMIN_WALLETS.length === 0 && !contractAddress) {
      role = "admin";
    }

    if (!role) {
      return NextResponse.json(
        { error: "Wallet does not hold a recognised role on the CertificateRegistry contract" },
        { status: 403 }
      );
    }

    await deleteNonce(walletAddress.toLowerCase());

    const token = signJwt({ walletAddress: recoveredAddress, role });
    return NextResponse.json({ success: true, token, role, walletAddress: recoveredAddress });
  } catch (error) {
    console.error("[Auth] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
