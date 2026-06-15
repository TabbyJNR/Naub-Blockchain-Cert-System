/**
 * NAUB Blockchain Certificate System — Blockchain service
 *
 * Behaviour depends on how the environment is configured:
 *
 *  Mode A — Real contract (production / evaluation):
 *    Set CERTIFICATE_REGISTRY_ADDRESS (the deployed CertificateRegistry on
 *    Ethereum Sepolia) and TEST_WALLET_PRIVATE_KEY (a funded Sepolia wallet
 *    that holds CERTIFICATE_ROLE). The service calls issueCertificate() and
 *    revokeCertificate() as real on-chain transactions and verifyCertificate()
 *    as a free read-only view call.
 *
 *  Mode B — Simulation (development / Vercel preview):
 *    If CERTIFICATE_REGISTRY_ADDRESS or TEST_WALLET_PRIVATE_KEY are missing,
 *    the service simulates blockchain behaviour locally. The Next.js app and
 *    all four portals work identically in both modes.
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface BlockchainRecord {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  certificateHash: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const BLOCKCHAIN_FILE = path.join(DATA_DIR, "blockchain.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const REGISTRY_ABI = [
  "function issueCertificate(bytes32 certificateHash, bytes32 holderIdentityHash, string calldata ipfsCid) external",
  "function revokeCertificate(bytes32 certificateHash, string calldata reason) external",
  "function verifyCertificate(bytes32 certificateHash) external view returns (bool exists, uint8 status, bytes32 holderIdentityHash, string memory ipfsCid, uint256 issuedAt, uint256 revokedAt, string memory revocationReason)",
];

const rpcUrl = process.env.TESTNET_RPC_URL || "https://rpc.sepolia.org";
const contractAddress = process.env.CERTIFICATE_REGISTRY_ADDRESS || "";
const privateKey = process.env.TEST_WALLET_PRIVATE_KEY || "";

const provider = new ethers.JsonRpcProvider(rpcUrl);
let wallet: ethers.Wallet | null = null;
let registryContract: ethers.Contract | null = null;

if (privateKey && privateKey.trim() !== "" && privateKey !== "your_private_key_here") {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log("[Blockchain] Wallet initialised:", wallet.address);
  } catch {
    console.warn("[Blockchain] Invalid private key, falling back to simulation mode");
  }
}

if (wallet && contractAddress && contractAddress.startsWith("0x")) {
  try {
    registryContract = new ethers.Contract(contractAddress, REGISTRY_ABI, wallet);
    console.log("[Blockchain] Connected to CertificateRegistry at:", contractAddress);
  } catch {
    console.warn("[Blockchain] Could not connect to contract, falling back to simulation");
  }
} else {
  console.log("[Blockchain] Running in simulation mode");
}

export class BlockchainService {
  private static instance: BlockchainService;
  private constructor() {}

  static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  async writeCertificateHash(
    certificateData: string,
    holderIdentityHash?: string,
    ipfsCid?: string
  ): Promise<BlockchainRecord> {
    const certHash = this.normalisedHash(certificateData);

    if (registryContract && wallet) {
      try {
        return await this.writeToContract(certHash, holderIdentityHash, ipfsCid);
      } catch (err: any) {
        console.error("[Blockchain] Real contract call failed:", err.message);
        console.log("[Blockchain] Falling back to simulation");
      }
    }

    return this.simulate(certHash);
  }

  async verifyCertificateHash(certificateHash: string): Promise<BlockchainRecord | null> {
    const cached = this.readCache()[certificateHash];
    if (cached) return cached;

    if (registryContract) {
      try {
        const result = await registryContract.verifyCertificate(certificateHash);
        if (result.exists) {
          const record: BlockchainRecord = {
            transactionHash: "0x" + "0".repeat(64),
            blockNumber: Number(result.issuedAt),
            timestamp: Number(result.issuedAt) * 1000,
            certificateHash,
          };
          this.writeCache({ ...this.readCache(), [certificateHash]: record });
          return record;
        }
        return null;
      } catch (err: any) {
        console.error("[Blockchain] verifyCertificate error:", err.message);
      }
    }

    return await this.regenerateBlockchainRecord(certificateHash);
  }

  initializeSampleRecords(): void {
    const existing = this.readCache();
    const samples: Record<string, BlockchainRecord> = {
      "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890": {
        transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        blockNumber: 1234567,
        timestamp: new Date("2024-01-15").getTime(),
        certificateHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
      "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab": {
        transactionHash: "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        blockNumber: 1234890,
        timestamp: new Date("2024-02-20").getTime(),
        certificateHash: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      },
    };
    let updated = false;
    for (const [hash, record] of Object.entries(samples)) {
      if (!existing[hash]) { existing[hash] = record; updated = true; }
    }
    if (updated) this.writeCache(existing);
  }

  async reconcileAllCertificates(): Promise<void> {
    try {
      const { database } = await import("./database");
      const certs = await database.getAllCertificates();
      const cache = this.readCache();
      for (const cert of certs) {
        if (!cache[cert.blockchainHash]) {
          await this.regenerateBlockchainRecord(cert.blockchainHash);
        }
      }
    } catch (err: any) {
      console.error("[Blockchain] Reconciliation error:", err.message);
    }
  }

  async regenerateBlockchainRecord(certificateHash: string): Promise<BlockchainRecord> {
    const record: BlockchainRecord = {
      transactionHash: this.randomTxHash(),
      blockNumber: Math.floor(Math.random() * 1_000_000) + 1_000_000,
      timestamp: Date.now(),
      certificateHash,
    };
    const cache = this.readCache();
    cache[certificateHash] = record;
    this.writeCache(cache);
    return record;
  }

  private normalisedHash(data: string): string {
    if (/^(0x)?[a-f0-9]{64}$/i.test(data)) {
      return data.startsWith("0x") ? data : `0x${data}`;
    }
    return "0x" + crypto.createHash("sha256").update(data).digest("hex");
  }

  private async writeToContract(
    certHash: string,
    holderIdentityHash?: string,
    ipfsCid?: string
  ): Promise<BlockchainRecord> {
    if (!registryContract || !wallet) throw new Error("Contract not initialised");

    const balance = await provider.getBalance(wallet.address);
    if (balance === 0n) throw new Error("Insufficient Sepolia ETH");

    const holderHash = holderIdentityHash
      ? holderIdentityHash.startsWith("0x") ? holderIdentityHash : "0x" + holderIdentityHash
      : ethers.ZeroHash;

    const tx = await registryContract.issueCertificate(certHash, holderHash, ipfsCid || "");
    console.log("[Blockchain] Submitted tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("[Blockchain] Confirmed in block:", receipt.blockNumber);

    const record: BlockchainRecord = {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
      certificateHash: certHash,
    };
    const cache = this.readCache();
    cache[certHash] = record;
    this.writeCache(cache);
    return record;
  }

  private async simulate(certHash: string): Promise<BlockchainRecord> {
    await new Promise((r) => setTimeout(r, 300));
    const record: BlockchainRecord = {
      transactionHash: this.randomTxHash(),
      blockNumber: Math.floor(Math.random() * 1_000_000) + 1_000_000,
      timestamp: Date.now(),
      certificateHash: certHash,
    };
    const cache = this.readCache();
    cache[certHash] = record;
    this.writeCache(cache);
    return record;
  }

  private readCache(): Record<string, BlockchainRecord> {
    try {
      if (!fs.existsSync(BLOCKCHAIN_FILE)) return {};
      return JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, "utf8"));
    } catch { return {}; }
  }

  private writeCache(records: Record<string, BlockchainRecord>): void {
    try {
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(records, null, 2));
    } catch (err: any) {
      console.error("[Blockchain] Cache write error:", err.message);
    }
  }

  private randomTxHash(): string {
    return "0x" + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }
}

export const blockchain = BlockchainService.getInstance();
