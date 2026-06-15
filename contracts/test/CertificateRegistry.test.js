const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * CertificateRegistry test suite (Chapter 3 — 32 unit tests)
 *
 * Organised into six groups matching the contract's responsibilities:
 *  1. Deployment & roles
 *  2. Role management (Registrar -> Registry Admin hierarchy)
 *  3. Certificate issuance
 *  4. Certificate verification (public, read-only)
 *  5. Certificate revocation (with mandatory reason)
 *  6. Pausable emergency controls
 */
describe("CertificateRegistry", function () {
  let registry;
  let superAdmin, registryAdmin, secondRegistryAdmin, outsider, employer;

  const sampleCertHash = ethers.id("NAUB-CERT-0001|AMINA YUSUF|B.SC. COMPUTER SCIENCE");
  const sampleHolderHash = ethers.id("AMINA YUSUF|1998-04-12");
  const sampleCid = "ipfs://bafybeigdemo0001";

  const otherCertHash = ethers.id("NAUB-CERT-0002|IBRAHIM MUSA|B.SC. CYBER SECURITY");
  const otherHolderHash = ethers.id("IBRAHIM MUSA|1997-09-22");
  const otherCid = "ipfs://bafybeigdemo0002";

  beforeEach(async function () {
    [superAdmin, registryAdmin, secondRegistryAdmin, outsider, employer] =
      await ethers.getSigners();

    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy(superAdmin.address);
    await registry.waitForDeployment();
  });

  // ------------------------------------------------------------------
  // 1. Deployment & roles (5 tests)
  // ------------------------------------------------------------------
  describe("Deployment & roles", function () {
    it("1. grants DEFAULT_ADMIN_ROLE to the super admin", async function () {
      const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, superAdmin.address)).to.equal(true);
    });

    it("2. grants SUPERADMIN_ROLE to the super admin", async function () {
      const SUPERADMIN_ROLE = await registry.SUPERADMIN_ROLE();
      expect(await registry.hasRole(SUPERADMIN_ROLE, superAdmin.address)).to.equal(true);
    });

    it("3. grants CERTIFICATE_ROLE to the super admin by default", async function () {
      const CERTIFICATE_ROLE = await registry.CERTIFICATE_ROLE();
      expect(await registry.hasRole(CERTIFICATE_ROLE, superAdmin.address)).to.equal(true);
    });

    it("4. reverts when deployed with the zero address as super admin", async function () {
      const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
      await expect(
        CertificateRegistry.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("CertificateRegistry: zero address");
    });

    it("5. initialises totalIssued and totalRevoked to zero", async function () {
      expect(await registry.totalIssued()).to.equal(0);
      expect(await registry.totalRevoked()).to.equal(0);
    });
  });

  // ------------------------------------------------------------------
  // 2. Role management (6 tests)
  // ------------------------------------------------------------------
  describe("Role management", function () {
    it("6. super admin can grant CERTIFICATE_ROLE to a Registry Admin wallet", async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      const CERTIFICATE_ROLE = await registry.CERTIFICATE_ROLE();
      expect(await registry.hasRole(CERTIFICATE_ROLE, registryAdmin.address)).to.equal(true);
    });

    it("7. super admin can revoke CERTIFICATE_ROLE from a Registry Admin wallet", async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      await registry.revokeCertificateRole(registryAdmin.address);
      const CERTIFICATE_ROLE = await registry.CERTIFICATE_ROLE();
      expect(await registry.hasRole(CERTIFICATE_ROLE, registryAdmin.address)).to.equal(false);
    });

    it("8. a non-super-admin cannot grant CERTIFICATE_ROLE", async function () {
      await expect(
        registry.connect(registryAdmin).grantCertificateRole(secondRegistryAdmin.address)
      ).to.be.reverted;
    });

    it("9. a non-super-admin cannot revoke CERTIFICATE_ROLE", async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      await expect(
        registry.connect(outsider).revokeCertificateRole(registryAdmin.address)
      ).to.be.reverted;
    });

    it("10. a wallet without CERTIFICATE_ROLE cannot issue certificates", async function () {
      await expect(
        registry.connect(outsider).issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      ).to.be.reverted;
    });

    it("11. after CERTIFICATE_ROLE is revoked, the wallet can no longer issue certificates", async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      await registry.revokeCertificateRole(registryAdmin.address);
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      ).to.be.reverted;
    });
  });

  // ------------------------------------------------------------------
  // 3. Certificate issuance (9 tests)
  // ------------------------------------------------------------------
  describe("Certificate issuance", function () {
    beforeEach(async function () {
      await registry.grantCertificateRole(registryAdmin.address);
    });

    it("12. a Registry Admin can issue a new certificate", async function () {
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      ).to.not.be.reverted;
    });

    it("13. issuing emits a CertificateIssued event with the correct arguments", async function () {
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      )
        .to.emit(registry, "CertificateIssued")
        .withArgs(sampleCertHash, sampleHolderHash, sampleCid, registryAdmin.address, anyValue);
    });

    it("14. issuing increments totalIssued", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      expect(await registry.totalIssued()).to.equal(1);
    });

    it("15. the stored record has status Valid (1)", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.status).to.equal(1); // Status.Valid
    });

    it("16. the stored record preserves the holder identity hash and IPFS CID", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.holderIdentityHash).to.equal(sampleHolderHash);
      expect(record.ipfsCid).to.equal(sampleCid);
    });

    it("17. the stored record has a non-zero issuedAt timestamp", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.issuedAt).to.be.greaterThan(0);
    });

    it("18. reverts when issuing with an empty (zero) certificate hash", async function () {
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(ethers.ZeroHash, sampleHolderHash, sampleCid)
      ).to.be.revertedWithCustomError(registry, "EmptyHash");
    });

    it("19. reverts when issuing a certificate hash that already exists", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);

      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, otherHolderHash, otherCid)
      ).to.be.revertedWithCustomError(registry, "CertificateAlreadyExists");
    });

    it("20. multiple distinct certificates can be issued by different Registry Admins", async function () {
      await registry.grantCertificateRole(secondRegistryAdmin.address);

      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      await registry
        .connect(secondRegistryAdmin)
        .issueCertificate(otherCertHash, otherHolderHash, otherCid);

      expect(await registry.totalIssued()).to.equal(2);
    });
  });

  // ------------------------------------------------------------------
  // 4. Certificate verification (6 tests)
  // ------------------------------------------------------------------
  describe("Certificate verification", function () {
    beforeEach(async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
    });

    it("21. returns exists = false for a hash that was never issued", async function () {
      const record = await registry.verifyCertificate(otherCertHash);
      expect(record.exists).to.equal(false);
      expect(record.status).to.equal(0); // Status.NonExistent
    });

    it("22. returns exists = true and status Valid for an issued certificate", async function () {
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.exists).to.equal(true);
      expect(record.status).to.equal(1); // Status.Valid
    });

    it("23. verification is callable by any address, including ones with no role", async function () {
      const record = await registry.connect(employer).verifyCertificate(sampleCertHash);
      expect(record.exists).to.equal(true);
    });

    it("24. a non-existent certificate has an empty revocation reason and zero revokedAt", async function () {
      const record = await registry.verifyCertificate(otherCertHash);
      expect(record.revokedAt).to.equal(0);
      expect(record.revocationReason).to.equal("");
    });

    it("25. an issued, non-revoked certificate has zero revokedAt and empty reason", async function () {
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.revokedAt).to.equal(0);
      expect(record.revocationReason).to.equal("");
    });

    it("26. verification does not consume gas-priced state changes (pure view call)", async function () {
      // A view call made via a static call must not change totalIssued/totalRevoked
      const before = await registry.totalIssued();
      await registry.verifyCertificate(sampleCertHash);
      const after = await registry.totalIssued();
      expect(after).to.equal(before);
    });
  });

  // ------------------------------------------------------------------
  // 5. Certificate revocation (7 tests)
  // ------------------------------------------------------------------
  describe("Certificate revocation", function () {
    const reason = "Issued in error - duplicate record, superseded by NAUB/CERT/2026/0042";

    beforeEach(async function () {
      await registry.grantCertificateRole(registryAdmin.address);
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
    });

    it("27. a Registry Admin can revoke an issued certificate with a reason", async function () {
      await expect(
        registry.connect(registryAdmin).revokeCertificate(sampleCertHash, reason)
      ).to.not.be.reverted;
    });

    it("28. revocation emits a CertificateRevoked event with the correct arguments", async function () {
      await expect(
        registry.connect(registryAdmin).revokeCertificate(sampleCertHash, reason)
      )
        .to.emit(registry, "CertificateRevoked")
        .withArgs(sampleCertHash, reason, registryAdmin.address, anyValue);
    });

    it("29. revocation sets status to Revoked, records revokedAt and the reason", async function () {
      await registry.connect(registryAdmin).revokeCertificate(sampleCertHash, reason);
      const record = await registry.verifyCertificate(sampleCertHash);
      expect(record.status).to.equal(2); // Status.Revoked
      expect(record.revokedAt).to.be.greaterThan(0);
      expect(record.revocationReason).to.equal(reason);
    });

    it("30. revocation increments totalRevoked", async function () {
      await registry.connect(registryAdmin).revokeCertificate(sampleCertHash, reason);
      expect(await registry.totalRevoked()).to.equal(1);
    });

    it("31. reverts when revoking a certificate hash that was never issued", async function () {
      await expect(
        registry.connect(registryAdmin).revokeCertificate(otherCertHash, reason)
      ).to.be.revertedWithCustomError(registry, "CertificateDoesNotExist");
    });

    it("32. reverts when the revocation reason is empty (FR-09)", async function () {
      await expect(
        registry.connect(registryAdmin).revokeCertificate(sampleCertHash, "")
      ).to.be.revertedWithCustomError(registry, "EmptyRevocationReason");
    });

    it("33. reverts when revoking a certificate that is already revoked", async function () {
      await registry.connect(registryAdmin).revokeCertificate(sampleCertHash, reason);
      await expect(
        registry.connect(registryAdmin).revokeCertificate(sampleCertHash, "second attempt")
      ).to.be.revertedWithCustomError(registry, "CertificateAlreadyRevoked");
    });
  });

  // ------------------------------------------------------------------
  // 6. Pausable emergency controls (5 tests)
  // ------------------------------------------------------------------
  describe("Pausable emergency controls", function () {
    beforeEach(async function () {
      await registry.grantCertificateRole(registryAdmin.address);
    });

    it("34. the super admin can pause the contract", async function () {
      await expect(registry.pause()).to.not.be.reverted;
      expect(await registry.paused()).to.equal(true);
    });

    it("35. a non-super-admin cannot pause the contract", async function () {
      await expect(registry.connect(registryAdmin).pause()).to.be.reverted;
    });

    it("36. issuance reverts while the contract is paused", async function () {
      await registry.pause();
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      ).to.be.reverted;
    });

    it("37. revocation reverts while the contract is paused", async function () {
      await registry
        .connect(registryAdmin)
        .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid);
      await registry.pause();
      await expect(
        registry.connect(registryAdmin).revokeCertificate(sampleCertHash, "reason")
      ).to.be.reverted;
    });

    it("38. the super admin can unpause, restoring normal operation", async function () {
      await registry.pause();
      await registry.unpause();
      expect(await registry.paused()).to.equal(false);
      await expect(
        registry
          .connect(registryAdmin)
          .issueCertificate(sampleCertHash, sampleHolderHash, sampleCid)
      ).to.not.be.reverted;
    });
  });
});

