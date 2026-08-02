/**
 * Mongoose schemas for the NAUB Blockchain Certificate System.
 *
 * Mirrors the Certificate and Verification interfaces in lib/database.ts.
 * Personal data fields (studentName, matriculationNumber, dateOfBirth)
 * live here, off-chain, in compliance with NDPR data minimisation -
 * only their SHA-256 hashes are ever written to the blockchain.
 */

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface CertificateDocument extends Document {
  id: string;
  studentName: string;
  matriculationNumber: string;
  dateOfBirth: string;
  programmeOfStudy: string;
  classOfDegree: string;
  dateOfAward: string;
  certificateNumber: string;
  viceChancellor: string;
  holderIdentityHash: string;
  ipfsCid: string;
  institutionName: string;
  certificateType: string;
  dateIssued: string;
  status: "valid" | "revoked";
  blockchainHash: string;
  transactionHash: string;
  blockNumber: number;
  issuedBy?: string;
  revocationTxHash?: string;
  revocationBlockNumber?: number;
  revokedAt?: string;
  revocationReason?: string;
}

const CertificateSchema = new Schema<CertificateDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentName: { type: String, required: true },
    // Indexed: checked on every issuance (duplicate-identifier check) and
    // used to scope a Registry Admin's own certificate list.
    matriculationNumber: { type: String, required: true, index: true },
    dateOfBirth: { type: String, required: true },
    programmeOfStudy: { type: String, required: true },
    classOfDegree: { type: String, required: true },
    dateOfAward: { type: String, required: true },
    // Indexed: checked on every issuance (duplicate-identifier check) and
    // used for direct certificate-number lookup on the verify page.
    certificateNumber: { type: String, required: true, index: true },
    viceChancellor: { type: String, required: true },
    holderIdentityHash: { type: String, required: true, index: true },
    ipfsCid: { type: String, required: true },
    institutionName: { type: String, required: true },
    certificateType: { type: String, required: true },
    dateIssued: { type: String, required: true },
    status: { type: String, enum: ["valid", "revoked"], required: true, default: "valid", index: true },
    blockchainHash: { type: String, required: true, index: true },
    transactionHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    issuedBy: { type: String, index: true }, // Registry Admin wallet address
    revocationTxHash: { type: String },
    revocationBlockNumber: { type: Number },
    revokedAt: { type: String },
    revocationReason: { type: String },
  },
  { timestamps: true }
);

export interface VerificationDocument extends Document {
  id: string;
  certificateId: string;
  timestamp: number;
  ipAddress: string;
}

const VerificationSchema = new Schema<VerificationDocument>(
  {
    id: { type: String, required: true, unique: true },
    certificateId: { type: String, required: true, index: true },
    timestamp: { type: Number, required: true },
    ipAddress: { type: String, required: true },
  },
  { timestamps: true }
);

/**
 * ForensicLog — Certificate Integrity Monitoring and Alert Service (CIMAS)
 *
 * Records every suspicious verification attempt against the system:
 * - Attempts that return NOT_FOUND (hash does not exist on blockchain)
 * - Attempts that return REVOKED (certificate has been cancelled)
 * - All attempts for complete audit trail visibility
 *
 * Personal data is never stored here. Only the hash submitted, the result,
 * network/device metadata, and a flag indicating whether the attempt was
 * suspicious. This satisfies FR-13 (forensic logging requirement).
 *
 * Super Admin can view all flagged entries from the dashboard notification
 * panel and the certificate audit trail view (FR-17).
 */
export interface ForensicLogDocument extends Document {
  // The hash the verifier submitted - never contains PII
  hashSubmitted: string;
  // What the system returned for that hash
  result: "VALID" | "REVOKED" | "NOT_FOUND";
  // Whether this attempt is flagged as suspicious (NOT_FOUND or REVOKED)
  flagged: boolean;
  // Certificate ID if one was found (null for NOT_FOUND results)
  certificateId: string | null;
  // Network metadata captured from request headers
  ipAddress: string;
  // Geolocation resolved from IP (best-effort, may be null)
  city: string | null;
  country: string | null;
  isp: string | null;
  // Device/browser fingerprint from User-Agent header
  browser: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  // Raw User-Agent string for reference
  userAgent: string | null;
  // When the attempt occurred (Unix ms)
  timestamp: number;
  // Whether the Super Admin has acknowledged/read this alert
  acknowledged: boolean;
}

const ForensicLogSchema = new Schema<ForensicLogDocument>(
  {
    hashSubmitted: { type: String, required: true, index: true },
    result: {
      type: String,
      enum: ["VALID", "REVOKED", "NOT_FOUND"],
      required: true,
      index: true,
    },
    flagged: { type: Boolean, required: true, default: false, index: true },
    certificateId: { type: String, default: null, index: true },
    ipAddress: { type: String, required: true },
    city: { type: String, default: null },
    country: { type: String, default: null },
    isp: { type: String, default: null },
    browser: { type: String, default: null },
    deviceType: { type: String, default: null },
    operatingSystem: { type: String, default: null },
    userAgent: { type: String, default: null },
    timestamp: { type: Number, required: true, index: true },
    acknowledged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Avoid re-compiling the model on every hot reload / serverless invocation.
export const CertificateModel: Model<CertificateDocument> =
  mongoose.models.Certificate || mongoose.model<CertificateDocument>("Certificate", CertificateSchema);

export const VerificationModel: Model<VerificationDocument> =
  mongoose.models.Verification || mongoose.model<VerificationDocument>("Verification", VerificationSchema);

export const ForensicLogModel: Model<ForensicLogDocument> =
  mongoose.models.ForensicLog || mongoose.model<ForensicLogDocument>("ForensicLog", ForensicLogSchema);
