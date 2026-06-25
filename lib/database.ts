// Database service - persists to MongoDB Atlas via lib/storage.ts

export interface Certificate {
  id: string;
  // Student identity fields (stored off-chain only - never written to blockchain)
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

  /**
   * Checks whether a matriculation number or certificate number is
   * already in use by any existing certificate record (valid or
   * revoked). These are meant to be globally unique identifiers - a
   * student only has one matriculation number, and a Ref. No /
   * certificate number should never be reused - so this check runs
   * BEFORE the on-chain transaction is requested, preventing a
   * Registry Admin from spending real Sepolia gas only to have the
   * issuance rejected afterward.
   *
   * Note: this is a deliberate addition beyond the original Chapter 3
   * design - the smart contract alone only rejects an exact duplicate
   * combined certificate hash, which would NOT catch two genuinely
   * different certificates that happen to reuse the same matriculation
   * number or certificate number. This off-chain uniqueness check
   * closes that gap.
   */
  async findDuplicateIdentifiers(
    matriculationNumber: string,
    certificateNumber: string,
  ): Promise<{ field: "matriculationNumber" | "certificateNumber"; existingCertificateId: string } | null> {
    const all = await this.getAllCertificates();

    const matricMatch = all.find(
      (c) => c.matriculationNumber.trim().toLowerCase() === matriculationNumber.trim().toLowerCase(),
    );
    if (matricMatch) {
      return { field: "matriculationNumber", existingCertificateId: matricMatch.id };
    }

    const certNumberMatch = all.find(
      (c) => c.certificateNumber.trim().toLowerCase() === certificateNumber.trim().toLowerCase(),
    );
    if (certNumberMatch) {
      return { field: "certificateNumber", existingCertificateId: certNumberMatch.id };
    }

    return null;
  }

  async getAnalytics() {
    const certs = await this.getAllCertificates();
    const verifications = await this.getVerifications();

    const validCerts = certs.filter((c) => c.status === "valid");
    const revokedCerts = certs.filter((c) => c.status === "revoked");

    // Active certificate holders = distinct individuals who hold at least
    // one currently-valid certificate (identified by the NDPR-safe
    // holderIdentityHash, never by name).
    const distinctActiveHolders = new Set(validCerts.map((c) => c.holderIdentityHash));

    // Most recent 5 certificates by issuance date, for the dashboard's
    // "Recent Certificates" panel. Computed here, in the same pass that
    // already fetched all certificates, so the dashboard only needs a
    // single API call instead of two separate full-table-scan requests.
    const recentCertificates = [...certs]
      .sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime())
      .slice(0, 5);

    return {
      totalCertificates: certs.length,
      validCertificates: validCerts.length,
      revokedCertificates: revokedCerts.length,
      totalVerifications: verifications.length,
      activeCertificateHolders: distinctActiveHolders.size,
      recentVerifications: verifications.slice(-10).reverse(),
      recentCertificates,
    };
  }
}

export const database = DatabaseService.getInstance();
