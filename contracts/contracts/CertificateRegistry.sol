// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CertificateRegistry
 * @author NAUB Blockchain Certificate System
 * @notice Anchors SHA-256 hashes of academic degree certificates issued by
 *         the Nigerian Army University Biu (NAUB) on the Ethereum Sepolia
 *         Testnet, providing a tamper-proof, publicly verifiable record of
 *         issuance and revocation.
 *
 * @dev Design notes (Chapter 3):
 *  - NO personally identifiable information (PII) is ever stored on-chain.
 *    Only one-way SHA-256 hashes of certificate data and of holder identity
 *    are recorded. Personal data lives off-chain in MongoDB and can be
 *    erased independently to satisfy NDPR Article 3.1(6) (right to
 *    erasure) without affecting the on-chain record, which remains an
 *    anonymous mathematical value.
 *  - Two roles enforce the institutional hierarchy identified in Chapter 1:
 *      SUPERADMIN_ROLE   — Registrar / Vice-Chancellor's office. Can grant
 *                          and revoke CERTIFICATE_ROLE, and pause/unpause
 *                          the contract in an emergency.
 *      CERTIFICATE_ROLE  — Registry Admin (clerical issuing staff). Can
 *                          issue and revoke individual certificates, but
 *                          cannot grant themselves additional privileges.
 *  - verifyCertificate is a free, read-only `view` function: any party
 *    (employer, NYSC, another university) can verify a certificate at
 *    zero gas cost, independent of the NAUB backend being online.
 */
contract CertificateRegistry is AccessControl, Pausable {
    /// @notice Role held by the Registrar / Vice-Chancellor's office.
    bytes32 public constant SUPERADMIN_ROLE = keccak256("SUPERADMIN_ROLE");

    /// @notice Role held by Registry Admins who issue and revoke certificates.
    bytes32 public constant CERTIFICATE_ROLE = keccak256("CERTIFICATE_ROLE");

    /// @notice Status of a certificate record.
    enum Status {
        NonExistent, // 0 - default value, no record at this hash
        Valid, // 1 - issued and currently valid
        Revoked // 2 - issued, then revoked
    }

    /// @notice On-chain record for a single certificate hash.
    struct CertificateRecord {
        Status status;
        bytes32 holderIdentityHash; // anonymised SHA-256(name|dateOfBirth)
        string ipfsCid; // pointer to the certificate PDF on IPFS
        uint256 issuedAt; // block timestamp of issuance
        uint256 revokedAt; // block timestamp of revocation (0 if not revoked)
        string revocationReason; // mandatory reason recorded on revocation (FR-09)
        address issuedBy; // wallet that issued the certificate
    }

    /// @dev certificateHash => record
    mapping(bytes32 => CertificateRecord) private _records;

    /// @notice Total number of certificates ever issued.
    uint256 public totalIssued;

    /// @notice Total number of certificates ever revoked.
    uint256 public totalRevoked;

    event CertificateIssued(
        bytes32 indexed certificateHash,
        bytes32 indexed holderIdentityHash,
        string ipfsCid,
        address indexed issuedBy,
        uint256 timestamp
    );

    event CertificateRevoked(
        bytes32 indexed certificateHash,
        string reason,
        address indexed revokedBy,
        uint256 timestamp
    );

    error CertificateAlreadyExists(bytes32 certificateHash);
    error CertificateDoesNotExist(bytes32 certificateHash);
    error CertificateAlreadyRevoked(bytes32 certificateHash);
    error EmptyHash();
    error EmptyRevocationReason();

    /**
     * @param superAdmin Address to receive SUPERADMIN_ROLE and the
     *        AccessControl DEFAULT_ADMIN_ROLE (typically the Registrar /
     *        Vice-Chancellor's office wallet). This address can grant
     *        CERTIFICATE_ROLE to Registry Admin wallets.
     */
    constructor(address superAdmin) {
        require(superAdmin != address(0), "CertificateRegistry: zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, superAdmin);
        _grantRole(SUPERADMIN_ROLE, superAdmin);
        // The super admin is also able to issue/revoke directly if needed.
        _grantRole(CERTIFICATE_ROLE, superAdmin);
    }

    /**
     * @notice Anchor a new certificate hash on-chain (FR-06/FR-07).
     * @param certificateHash SHA-256 hash of the canonical certificate
     *        payload (the eight required fields), computed client-side.
     * @param holderIdentityHash SHA-256 hash of the holder's
     *        name + date of birth (NDPR-safe lookup key for the holder
     *        portal).
     * @param ipfsCid IPFS content identifier for the certificate PDF.
     */
    function issueCertificate(
        bytes32 certificateHash,
        bytes32 holderIdentityHash,
        string calldata ipfsCid
    ) external onlyRole(CERTIFICATE_ROLE) whenNotPaused {
        if (certificateHash == bytes32(0)) revert EmptyHash();
        if (_records[certificateHash].status != Status.NonExistent) {
            revert CertificateAlreadyExists(certificateHash);
        }

        _records[certificateHash] = CertificateRecord({
            status: Status.Valid,
            holderIdentityHash: holderIdentityHash,
            ipfsCid: ipfsCid,
            issuedAt: block.timestamp,
            revokedAt: 0,
            revocationReason: "",
            issuedBy: msg.sender
        });

        totalIssued += 1;

        emit CertificateIssued(
            certificateHash,
            holderIdentityHash,
            ipfsCid,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Revoke a previously issued certificate (FR-09). A reason is
     *         mandatory and is permanently recorded alongside the
     *         revocation timestamp.
     * @param certificateHash Hash of the certificate to revoke.
     * @param reason Human-readable reason for revocation (e.g. "Issued in
     *        error — duplicate record").
     */
    function revokeCertificate(
        bytes32 certificateHash,
        string calldata reason
    ) external onlyRole(CERTIFICATE_ROLE) whenNotPaused {
        CertificateRecord storage record = _records[certificateHash];

        if (record.status == Status.NonExistent) {
            revert CertificateDoesNotExist(certificateHash);
        }
        if (record.status == Status.Revoked) {
            revert CertificateAlreadyRevoked(certificateHash);
        }
        if (bytes(reason).length == 0) revert EmptyRevocationReason();

        record.status = Status.Revoked;
        record.revokedAt = block.timestamp;
        record.revocationReason = reason;

        totalRevoked += 1;

        emit CertificateRevoked(certificateHash, reason, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a certificate hash. Free, read-only — callable by
     *         anyone (employers, NYSC, other universities) at zero gas
     *         cost.
     * @param certificateHash Hash to verify.
     * @return exists Whether any record exists at this hash.
     * @return status 0 = none, 1 = valid, 2 = revoked.
     * @return holderIdentityHash The anonymised holder identity hash.
     * @return ipfsCid IPFS pointer to the certificate PDF.
     * @return issuedAt Unix timestamp of issuance (0 if non-existent).
     * @return revokedAt Unix timestamp of revocation (0 if not revoked).
     * @return revocationReason Reason given at revocation ("" if not revoked).
     */
    function verifyCertificate(bytes32 certificateHash)
        external
        view
        returns (
            bool exists,
            Status status,
            bytes32 holderIdentityHash,
            string memory ipfsCid,
            uint256 issuedAt,
            uint256 revokedAt,
            string memory revocationReason
        )
    {
        CertificateRecord storage record = _records[certificateHash];
        exists = record.status != Status.NonExistent;
        return (
            exists,
            record.status,
            record.holderIdentityHash,
            record.ipfsCid,
            record.issuedAt,
            record.revokedAt,
            record.revocationReason
        );
    }

    /**
     * @notice Pause the contract, disabling new issuances and revocations.
     *         Restricted to SUPERADMIN_ROLE as an emergency control.
     */
    function pause() external onlyRole(SUPERADMIN_ROLE) {
        _pause();
    }

    /// @notice Resume normal operation.
    function unpause() external onlyRole(SUPERADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Grant CERTIFICATE_ROLE to a Registry Admin wallet.
     * @dev Restricted to SUPERADMIN_ROLE rather than DEFAULT_ADMIN_ROLE so
     *      that role management always flows through the Registrar /
     *      Vice-Chancellor's office, per the institutional hierarchy in
     *      Chapter 1.
     */
    function grantCertificateRole(address account) external onlyRole(SUPERADMIN_ROLE) {
        grantRole(CERTIFICATE_ROLE, account);
    }

    /// @notice Revoke CERTIFICATE_ROLE from a Registry Admin wallet.
    function revokeCertificateRole(address account) external onlyRole(SUPERADMIN_ROLE) {
        revokeRole(CERTIFICATE_ROLE, account);
    }
}
