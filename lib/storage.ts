// Simple file-based storage for development
// In production, this would be replaced with MongoDB

import fs from "fs";
import path from "path";
import type { Certificate, Verification } from "./database";

const DATA_DIR = path.join(process.cwd(), ".data");
const CERTIFICATES_FILE = path.join(DATA_DIR, "certificates.json");
const VERIFICATIONS_FILE = path.join(DATA_DIR, "verifications.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class FileStorage {
  private static instance: FileStorage;
  private inMemoryStorage: {
    certificates: Record<string, Certificate>;
    verifications: Verification[];
  } = {
    certificates: {},
    verifications: [],
  };

  private constructor() {}

  static getInstance(): FileStorage {
    if (!FileStorage.instance) {
      FileStorage.instance = new FileStorage();
    }
    return FileStorage.instance;
  }

  async createCertificate(cert: Certificate): Promise<Certificate> {
    console.log(`[FileStorage] Creating certificate: ${cert.id}`);
    const certificates = await this.getCertificates();
    certificates[cert.id] = cert;
    await this.saveCertificates(certificates);
    return cert;
  }

  async getCertificate(id: string): Promise<Certificate | null> {
    const certificates = await this.getCertificates();
    return certificates[id] || null;
  }

  async getAllCertificates(): Promise<Certificate[]> {
    const certificates = await this.getCertificates();
    return Object.values(certificates);
  }

  async updateCertificate(
    id: string,
    updates: Partial<Certificate>
  ): Promise<Certificate | null> {
    const certificates = await this.getCertificates();
    const cert = certificates[id];
    if (!cert) return null;
    const updated = { ...cert, ...updates };
    certificates[id] = updated;
    await this.saveCertificates(certificates);
    return updated;
  }

  async deleteCertificate(id: string): Promise<boolean> {
    const certificates = await this.getCertificates();
    if (!certificates[id]) return false;
    delete certificates[id];
    await this.saveCertificates(certificates);
    return true;
  }

  async logVerification(verification: Verification): Promise<void> {
    const verifications = await this.getVerificationsData();
    verifications.push(verification);
    await this.saveVerifications(verifications);
  }

  async getVerifications(): Promise<Verification[]> {
    return await this.getVerificationsData();
  }

  private async getCertificates(): Promise<Record<string, Certificate>> {
    try {
      if (!fs.existsSync(CERTIFICATES_FILE)) {
        return this.inMemoryStorage.certificates;
      }
      const data = fs.readFileSync(CERTIFICATES_FILE, "utf8");
      const fileData = JSON.parse(data);
      return { ...fileData, ...this.inMemoryStorage.certificates };
    } catch (error) {
      console.error("[FileStorage] Error reading certificates:", error);
      return this.inMemoryStorage.certificates;
    }
  }

  private async saveCertificates(
    certificates: Record<string, Certificate>
  ): Promise<void> {
    try {
      fs.writeFileSync(CERTIFICATES_FILE, JSON.stringify(certificates, null, 2));
    } catch (error) {
      console.error("[FileStorage] Error saving certificates:", error);
    }
    this.inMemoryStorage.certificates = { ...certificates };
  }

  private async getVerificationsData(): Promise<Verification[]> {
    try {
      if (!fs.existsSync(VERIFICATIONS_FILE)) {
        return this.inMemoryStorage.verifications;
      }
      const data = fs.readFileSync(VERIFICATIONS_FILE, "utf8");
      const fileData = JSON.parse(data);
      return [...fileData, ...this.inMemoryStorage.verifications];
    } catch (error) {
      return this.inMemoryStorage.verifications;
    }
  }

  private async saveVerifications(verifications: Verification[]): Promise<void> {
    try {
      fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify(verifications, null, 2));
    } catch (error) {
      console.error("[FileStorage] Error saving verifications:", error);
    }
    this.inMemoryStorage.verifications = [...verifications];
  }

  async initializeSampleData(): Promise<void> {
    const sampleCerts: Certificate[] = [
      {
        id: "NAUB-2024-001",
        studentName: "Amina Yusuf",
        matriculationNumber: "NAUB/UG/2020/0001",
        dateOfBirth: "1998-04-12",
        programmeOfStudy: "B.Sc. Computer Science",
        classOfDegree: "Second Class Honours (Upper Division)",
        dateOfAward: "2024-01-15",
        certificateNumber: "NAUB/CERT/2024/001",
        viceChancellor: "Professor NAUB Vice Chancellor",
        holderIdentityHash:
          "d2e17f9a5ffc1632ed9eb6f4b6f5da4ca47740887ec869a6fdb9c02439178990",
        ipfsCid: "ipfs://demo-NAUB-2024-001",
        institutionName: "Nigerian Army University Biu",
        certificateType: "DEGREE",
        dateIssued: "2024-01-15",
        status: "valid",
        blockchainHash:
          "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
        transactionHash:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        blockNumber: 1234567,
      },
      {
        id: "NAUB-2024-002",
        studentName: "Ibrahim Musa",
        matriculationNumber: "NAUB/UG/2020/0002",
        dateOfBirth: "1997-09-22",
        programmeOfStudy: "B.Sc. Cyber Security",
        classOfDegree: "First Class Honours",
        dateOfAward: "2024-02-20",
        certificateNumber: "NAUB/CERT/2024/002",
        viceChancellor: "Professor NAUB Vice Chancellor",
        holderIdentityHash:
          "92552a00d270a6e894690b8f2209e19fc6b228f1a8fa438bbdc2c2da1313fe5e",
        ipfsCid: "ipfs://demo-NAUB-2024-002",
        institutionName: "Nigerian Army University Biu",
        certificateType: "DEGREE",
        dateIssued: "2024-02-20",
        status: "valid",
        blockchainHash:
          "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        transactionHash:
          "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
        blockNumber: 1234890,
      },
    ];

    const existingCerts = await this.getCertificates();
    if (Object.keys(existingCerts).length === 0) {
      console.log("[FileStorage] Initializing sample data");
      for (const cert of sampleCerts) {
        this.inMemoryStorage.certificates[cert.id] = cert;
      }
      try {
        await this.saveCertificates(this.inMemoryStorage.certificates);
      } catch (error) {
        console.log("[FileStorage] Sample data initialized in memory only");
      }
    }
  }
}

export const fileStorage = FileStorage.getInstance();
