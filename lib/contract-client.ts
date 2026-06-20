"use client";

/**
 * Browser-side helper for talking to the deployed CertificateRegistry
 * contract directly through the user's connected MetaMask wallet.
 *
 * Used by the Issue and Revoke flows so that every state-changing
 * blockchain action (issueCertificate, revokeCertificate) is signed
 * and paid for by the Registry Admin's own wallet — not a shared
 * server-side key. This matches the institutional accountability
 * model described in Chapter 3 (each transaction is attributable to
 * the wallet that submitted it).
 *
 * Read-only verification (verifyCertificate) does NOT need this —
 * it stays on the backend as a free, gas-less RPC call so the public
 * verification page works without requiring a wallet at all.
 */

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Only the functions the browser needs to call directly.
const REGISTRY_ABI = [
  "function issueCertificate(bytes32 certificateHash, bytes32 holderIdentityHash, string calldata ipfsCid) external",
  "function revokeCertificate(bytes32 certificateHash, string calldata reason) external",
];

export interface OnChainTxResult {
  transactionHash: string;
  blockNumber: number;
}

/**
 * Returns the contract address configured for this deployment, or null
 * if the system is running in simulation mode (no contract deployed yet).
 */
export async function getRegistryContractAddress(): Promise<string | null> {
  try {
    const res = await fetch("/api/config/contract");
    if (!res.ok) return null;
    const data = await res.json();
    return data.contractAddress || null;
  } catch {
    return null;
  }
}

/**
 * Issue a certificate by calling issueCertificate() directly on-chain
 * through the connected MetaMask wallet. Triggers a real MetaMask
 * confirmation popup and a real Sepolia gas payment.
 */
export async function issueCertificateOnChain(
  contractAddress: string,
  certificateHash: string,
  holderIdentityHash: string,
  ipfsCid: string
): Promise<OnChainTxResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available. Please install MetaMask to issue certificates.");
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, signer);

  const certHash = certificateHash.startsWith("0x") ? certificateHash : `0x${certificateHash}`;
  const holderHash = holderIdentityHash.startsWith("0x")
    ? holderIdentityHash
    : `0x${holderIdentityHash}`;

  const tx = await contract.issueCertificate(certHash, holderHash, ipfsCid || "");
  const receipt = await tx.wait();

  return {
    transactionHash: tx.hash,
    blockNumber: Number(receipt.blockNumber),
  };
}

/**
 * Revoke a certificate by calling revokeCertificate() directly on-chain
 * through the connected MetaMask wallet.
 */
export async function revokeCertificateOnChain(
  contractAddress: string,
  certificateHash: string,
  reason: string
): Promise<OnChainTxResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available. Please install MetaMask to revoke certificates.");
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, signer);

  const certHash = certificateHash.startsWith("0x") ? certificateHash : `0x${certificateHash}`;

  const tx = await contract.revokeCertificate(certHash, reason);
  const receipt = await tx.wait();

  return {
    transactionHash: tx.hash,
    blockNumber: Number(receipt.blockNumber),
  };
}
