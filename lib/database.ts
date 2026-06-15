// Database service that uses file storage for persistence
// In production, this would use MongoDB

export interface Certificate {
  id: string;
  // Student identity fields (stored off-chain only — never written to blockchain)
  studentName: string;
  matriculationNumber: string;
  dateOfBirth: string;
  // Academic credential fields
  programmeOfStudy: string;
  classOfDegree: string;
  dateOfAward: string;
  certificateNumber: string;
  viceChancellor: string;
  // System fields
  holderIdentityHash: string; // SHA-256 hash of studentName + dateOfBirth (NDPR-safe)
  ipfsCid: string;
  institutionName: string;
  certificateType: string;
  dateIssued: string;
  status: "valid" | "revoked";
  // Blockchain fields
  blockchainHash: string;
  transactionHash: string;
  blockNumber: number;
  // Revocation fields (optional)
  revocationTxHash?: string;
  revocationBlockNumber?: number;
  revokedAt?: string;
  revocationReason?: string;
}

export interface Verification {
  id: string;
  certificateId: string;
  timestamp: number;
  ipAddress: string;
}

class DatabaseService {
  private static instance: DatabaseService;
  private fileStorage: any;

  private constructor() {
    this.initializeStorage();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeStorage() {
    const { fileStorage } = await import("./storage");
    const { blockchain } = await import("./blockchain");
    this.fileStorage = fileStorage;
    await this.fileStorage.initializeSampleData();
    blockchain.initializeSampleRecords();
    await blockchain.reconcileAllCertificates();
  }

  async createCertificate(cert: Certificate): Promise<Certificate> {
    console.log(`[Database] Creating certificate: ${cert.id}`);
    return await this.fileStorage.createCertificate(cert);
  }

  async getCertificate(id: string): Promise<Certificate | null> {
    console.log(`[Database] Getting certificate: ${id}`);
    return await this.fileStorage.getCertificate(id);
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return await this.fileStorage.getAllCertificates();
  }

  async updateCertificate(
    id: string,
    updates: Partial<Certificate>,
  ): Promise<Certificate | null> {
    return await this.fileStorage.updateCertificate(id, updates);
  }

  async deleteCertificate(id: string): Promise<boolean> {
    return await this.fileStorage.deleteCertificate(id);
  }

  async logVerification(verification: Verification): Promise<void> {
    return await this.fileStorage.logVerification(verification);
  }

  async getVerifications(): Promise<Verification[]> {
    return await this.fileStorage.getVerifications();
  }

  /**
   * NDPR right-to-erasure: delete all off-chain personal data for a student.
   * The on-chain hash record remains as an anonymous mathematical value.
   */
  async erasePersonalData(
    matriculationNumber: string,
    dateOfBirth: string,
  ): Promise<{ deleted: number }> {
    const all = await this.getAllCertificates();
    const targets = all.filter(
      (c) =>
        c.matriculationNumber === matriculationNumber &&
        c.dateOfBirth === dateOfBirth,
    );
    for (const cert of targets) {
      await this.deleteCertificate(cert.id);
    }
    return { deleted: targets.length };
  }

  async getAnalytics() {
    const certs = await this.getAllCertificates();
    const verifications = await this.getVerifications();
    return {
      totalCertificates: certs.length,
      validCertificates: certs.filter((c) => c.status === "valid").length,
      revokedCertificates: certs.filter((c) => c.status === "revoked").length,
      totalVerifications: verifications.length,
      recentVerifications: verifications.slice(-10).reverse(),
    };
  }
}

export const database = DatabaseService.getInstance();
