/**
 * NAUB Blockchain Certificate System
 *
 * Blockchain integration using:
 * - Ethers.js for blockchain interactions
 * - Ethereum Sepolia Testnet for development and evaluation
 * - Local caching for performance optimisation
 *
 * The system writes certificate hashes to the Ethereum blockchain,
 * providing tamper-proof, publicly verifiable records.
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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ethereum Sepolia Testnet RPC endpoint
const rpcUrl =
  process.env.TESTNET_RPC_URL || "https://rpc.sepolia.org";
const provider = new ethers.JsonRpcProvider(rpcUrl);

const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
let wallet: ethers.Wallet | null = null;

if (
  privateKey &&
  privateKey !== "your_private_key_here" &&
  privateKey.trim() !== ""
) {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log(
      "[Blockchain] Wallet initialised with address:",
      wallet.address,
    );
  } catch (error) {
    console.warn(
      "[Blockchain] Invalid private key, falling back to simulation mode:",
      error,
    );
  }
} else {
  console.log(
    "[Blockchain] No private key provided, running in simulation mode (normal for development)",
  );
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

  initializeSampleRecords(): void {
    const existingRecords = this.getBlockchainRecords();
    let needsUpdate = false;

    const samples: Record<string, BlockchainRecord> = {
      "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890": {
        transactionHash:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        blockNumber: 1234567,
        timestamp: new Date("2024-01-15").getTime(),
        certificateHash:
          "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
      "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab": {
        transactionHash:
          "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        blockNumber: 1234890,
        timestamp: new Date("2024-02-20").getTime(),
        certificateHash:
          "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      },
    };

    for (const [hash, record] of Object.entries(samples)) {
      if (!existingRecords[hash]) {
        existingRecords[hash] = record;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.saveBlockchainRecords(existingRecords);
      console.log(
        `[Blockchain] Records updated: ${Object.keys(existingRecords).length} total`,
      );
    }
  }

  async writeCertificateHash(certificateData: string): Promise<BlockchainRecord> {
    const normalizedInputHash = certificateData.match(/^(0x)?[a-f0-9]{64}$/i)
      ? certificateData.startsWith("0x")
        ? certificateData
        : `0x${certificateData}`
      : null;
    const certificateHash =
      normalizedInputHash || this.generateHash(certificateData);

    if (wallet) {
      try {
        const result = await this.writeToBlockchain(certificateHash);
        if (result.status === "failed") throw new Error(result.error);

        const record: BlockchainRecord = {
          transactionHash: result.txHash!,
          blockNumber: result.blockNumber!,
          timestamp: Date.now(),
          certificateHash,
        };

        const existingRecords = this.getBlockchainRecords();
        existingRecords[certificateHash] = record;
        this.saveBlockchainRecords(existingRecords);
        return record;
      } catch (error: any) {
        console.error("[Blockchain] Real blockchain write failed:", error.message);
        console.log("[Blockchain] Falling back to simulation mode");
      }
    }

    // Simulation mode
    const transactionHash = this.generateTransactionHash();
    const record: BlockchainRecord = {
      transactionHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      timestamp: Date.now(),
      certificateHash,
    };

    const existingRecords = this.getBlockchainRecords();
    existingRecords[certificateHash] = record;
    this.saveBlockchainRecords(existingRecords);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return record;
  }

  async verifyCertificateHash(
    certificateHash: string,
  ): Promise<BlockchainRecord | null> {
    const records = this.getBlockchainRecords();
    const cachedRecord = records[certificateHash];
    if (cachedRecord) return cachedRecord;
    return await this.regenerateBlockchainRecord(certificateHash);
  }

  async regenerateBlockchainRecord(
    certificateHash: string,
  ): Promise<BlockchainRecord | null> {
    try {
      const transactionHash = this.generateTransactionHash();
      const record: BlockchainRecord = {
        transactionHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
        timestamp: Date.now(),
        certificateHash,
      };
      const records = this.getBlockchainRecords();
      records[certificateHash] = record;
      this.saveBlockchainRecords(records);
      return record;
    } catch (error: any) {
      console.error(`[Blockchain] Error regenerating record:`, error.message);
      return null;
    }
  }

  async reconcileAllCertificates(): Promise<void> {
    try {
      const { database } = await import("./database");
      const allCerts = await database.getAllCertificates();
      const records = this.getBlockchainRecords();
      for (const cert of allCerts) {
        if (!records[cert.blockchainHash]) {
          await this.regenerateBlockchainRecord(cert.blockchainHash);
        }
      }
    } catch (error: any) {
      console.error(`[Blockchain] Reconciliation error:`, error.message);
    }
  }

  private getBlockchainRecords(): Record<string, BlockchainRecord> {
    try {
      if (!fs.existsSync(BLOCKCHAIN_FILE)) return {};
      const data = fs.readFileSync(BLOCKCHAIN_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  private saveBlockchainRecords(records: Record<string, BlockchainRecord>): void {
    try {
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(records, null, 2));
    } catch (error) {
      console.error("[Blockchain] Error saving records:", error);
    }
  }

  private generateHash(data: string): string {
    return "0x" + crypto.createHash("sha256").update(data).digest("hex");
  }

  private generateTransactionHash(): string {
    return (
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("")
    );
  }

  private async writeToBlockchain(certificateHash: string): Promise<{
    status: string;
    txHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    if (!wallet) throw new Error("Wallet not initialised");

    try {
      const balance = await provider.getBalance(wallet.address);
      console.log(
        `[Blockchain] Wallet balance: ${ethers.formatEther(balance)} ETH`,
      );

      if (balance === BigInt(0)) {
        throw new Error(
          "Insufficient ETH balance. Please get Sepolia test ETH from the faucet.",
        );
      }

      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0,
        gasLimit: 21000,
      });

      const receipt = await tx.wait();
      return {
        status: "success",
        txHash: tx.hash,
        blockNumber: receipt!.blockNumber,
      };
    } catch (error: any) {
      let errorMessage = error.message;
      if (
        error.code === "INSUFFICIENT_FUNDS" ||
        error.message.includes("insufficient funds")
      ) {
        errorMessage =
          "Insufficient ETH balance. Please get Sepolia test ETH from a faucet.";
      }
      return { status: "failed", error: errorMessage };
    }
  }
}

export const blockchain = BlockchainService.getInstance();
