/**
 * Off-chain data storage — MongoDB Atlas.
 *
 * Implements the same method signatures the rest of the app already
 * depends on (createCertificate, getCertificate, getAllCertificates,
 * updateCertificate, deleteCertificate, logVerification, getVerifications)
 * so that lib/database.ts and every API route that calls it continue to
 * work unchanged. Internally, every method now reads from and writes to
 * a real MongoDB Atlas database rather than a local JSON file, which is
 * required because Vercel's serverless functions do not provide a
 * persistent filesystem between requests.
 */

import { connectToDatabase } from "./mongodb";
import { CertificateModel, VerificationModel } from "./models";
import type { Certificate, Verification } from "./database";

class FileStorage {
  private static instance: FileStorage;
  private constructor() {}

  static getInstance(): FileStorage {
    if (!FileStorage.instance) {
      FileStorage.instance = new FileStorage();
    }
    return FileStorage.instance;
  }

  async createCertificate(cert: Certificate): Promise<Certificate> {
    console.log(`[Storage] Creating certificate: ${cert.id}`);
    await connectToDatabase();
    await CertificateModel.create(cert);
    return cert;
  }

  async getCertificate(id: string): Promise<Certificate | null> {
    await connectToDatabase();
    const doc = await CertificateModel.findOne({ id }).lean();
    return doc ? this.toPlainCertificate(doc) : null;
  }

  async getAllCertificates(): Promise<Certificate[]> {
    await connectToDatabase();
    const docs = await CertificateModel.find({}).lean();
    return docs.map((doc) => this.toPlainCertificate(doc));
  }

  async updateCertificate(
    id: string,
    updates: Partial<Certificate>
  ): Promise<Certificate | null> {
    await connectToDatabase();
    const doc = await CertificateModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    ).lean();
    return doc ? this.toPlainCertificate(doc) : null;
  }

  async deleteCertificate(id: string): Promise<boolean> {
    await connectToDatabase();
    const result = await CertificateModel.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async logVerification(verification: Verification): Promise<void> {
    await connectToDatabase();
    await VerificationModel.create(verification);
  }

  async getVerifications(): Promise<Verification[]> {
    await connectToDatabase();
    const docs = await VerificationModel.find({}).sort({ timestamp: 1 }).lean();
    return docs.map((doc) => ({
      id: doc.id,
      certificateId: doc.certificateId,
      timestamp: doc.timestamp,
      ipAddress: doc.ipAddress,
    }));
  }

  /**
   * Intentionally a no-op. The system starts with zero certificates and
   * zero verifications — every record shown in the admin dashboard must
   * come from a real issuance, revocation, or verification event.
   */
  async initializeSampleData(): Promise<void> {
    return;
  }

  /** Strip Mongo-specific fields (_id, __v) before returning to the app layer. */
  private toPlainCertificate(doc: any): Certificate {
    const { _id, __v, createdAt, updatedAt, ...rest } = doc;
    return rest as Certificate;
  }
}

export const fileStorage = FileStorage.getInstance();
