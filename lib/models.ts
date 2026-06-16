/**
 * Mongoose schemas for the NAUB Blockchain Certificate System.
 *
 * Mirrors the Certificate and Verification interfaces in lib/database.ts.
 * Personal data fields (studentName, matriculationNumber, dateOfBirth)
 * live here, off-chain, in compliance with NDPR data minimisation —
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
  revocationTxHash?: string;
  revocationBlockNumber?: number;
  revokedAt?: string;
  revocationReason?: string;
}

const CertificateSchema = new Schema<CertificateDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentName: { type: String, required: true },
    matriculationNumber: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    programmeOfStudy: { type: String, required: true },
    classOfDegree: { type: String, required: true },
    dateOfAward: { type: String, required: true },
    certificateNumber: { type: String, required: true },
    viceChancellor: { type: String, required: true },
    holderIdentityHash: { type: String, required: true, index: true },
    ipfsCid: { type: String, required: true },
    institutionName: { type: String, required: true },
    certificateType: { type: String, required: true },
    dateIssued: { type: String, required: true },
    status: { type: String, enum: ["valid", "revoked"], required: true, default: "valid" },
    blockchainHash: { type: String, required: true, index: true },
    transactionHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
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

// Avoid re-compiling the model on every hot reload / serverless invocation.
export const CertificateModel: Model<CertificateDocument> =
  mongoose.models.Certificate || mongoose.model<CertificateDocument>("Certificate", CertificateSchema);

export const VerificationModel: Model<VerificationDocument> =
  mongoose.models.Verification || mongoose.model<VerificationDocument>("Verification", VerificationSchema);
