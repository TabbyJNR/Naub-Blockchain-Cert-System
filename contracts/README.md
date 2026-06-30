# NAUB CertificateRegistry - Smart Contract

Hardhat project containing the `CertificateRegistry` smart contract for the
Nigerian Army University Biu (NAUB) Blockchain Certificate System, as designed
in Chapter 3 of the project documentation.

---

## Overview

`CertificateRegistry.sol` anchors SHA-256 hashes of NAUB degree certificates
on the **Ethereum Sepolia Testnet**, providing a tamper-proof, publicly
verifiable record of every certificate issued or revoked.

Key design decisions (Chapter 3):

- **No PII on-chain** - only one-way SHA-256 hashes are stored. Personal data
  lives off-chain in MongoDB and can be erased independently to satisfy NDPR
  Article 3.1(6) (right to erasure) without affecting the on-chain record.
- **Two roles** enforce the institutional hierarchy:
  - `SUPERADMIN_ROLE` - Registrar / Vice-Chancellor's office. Can grant/revoke
    `CERTIFICATE_ROLE` and pause the contract in an emergency.
  - `CERTIFICATE_ROLE` - Registry Admin (issuing staff). Can issue and revoke
    individual certificates.
- **`verifyCertificate`** is a free, read-only `view` function - any employer,
  NYSC office, or third party can verify a certificate at zero gas cost,
  independent of the NAUB backend being online.

---

## Project Structure

```
contracts/
├── contracts/
│   └── CertificateRegistry.sol   # The smart contract
├── scripts/
│   └── deploy.js                 # Sepolia deployment script
├── test/
│   └── CertificateRegistry.test.js  # 38 unit tests
├── hardhat.config.js
├── package.json
├── .env.example                  # Environment variable template
└── slither-report.json           # Slither static analysis output
```

---

## Prerequisites

- Node.js 18 or 20 LTS
- A MetaMask wallet (or any Ethereum wallet) with Sepolia test ETH
  → Get free test ETH from **https://sepoliafaucet.com**
- A Sepolia RPC endpoint (free tier from Infura or Alchemy works fine)

---

## Setup

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env and fill in SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY
```

---

## Compile

```bash
npm run compile
# or: npx hardhat compile
```

---

## Run the 38 unit tests

```bash
npm test
# or: npx hardhat test
```

Expected output: **38 passing** across six test groups:

| Group | Tests | Description |
|-------|-------|-------------|
| Deployment & roles | 5 | Constructor, role assignment, initial state |
| Role management | 6 | Grant/revoke CERTIFICATE_ROLE, access control |
| Certificate issuance | 9 | Issue, events, validation, duplicate detection |
| Certificate verification | 6 | Public view, zero-gas, non-existent hash |
| Certificate revocation | 7 | Revoke, mandatory reason (FR-09), events |
| Pausable controls | 5 | Pause/unpause, emergency blocking |

---

## Slither static analysis

```bash
pip install slither-analyzer
slither contracts/CertificateRegistry.sol \
  --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/"
```

Results (see `slither-report.json`):
- **0 HIGH findings** in `CertificateRegistry.sol`
- **0 MEDIUM findings** in `CertificateRegistry.sol`
- **0 LOW findings** in `CertificateRegistry.sol`
- 9 informational findings, all in imported OpenZeppelin library files
  (different pragma versions, unused internal functions - not actionable)

---

## Deploy to Ethereum Sepolia Testnet

1. Make sure your `.env` is filled in with:
   - `SEPOLIA_RPC_URL` - e.g. `https://sepolia.infura.io/v3/YOUR_KEY`
   - `DEPLOYER_PRIVATE_KEY` - private key of a wallet with Sepolia ETH

2. Run:
   ```bash
   npm run deploy:sepolia
   ```

3. The script prints:
   ```
   Contract address    : 0x...
   Transaction hash    : 0x...
   Etherscan           : https://sepolia.etherscan.io/address/0x...
   ```

4. Copy `CERTIFICATE_REGISTRY_ADDRESS` into your Vercel environment variables.
   The Next.js app (`lib/blockchain.ts`) will automatically switch from
   simulation mode to calling the real deployed contract.

---

## Contract functions

| Function | Access | Description |
|----------|--------|-------------|
| `issueCertificate(certHash, holderHash, ipfsCid)` | `CERTIFICATE_ROLE` | Anchor a certificate hash on-chain |
| `verifyCertificate(certHash)` | Public (free) | Read certificate status and metadata |
| `revokeCertificate(certHash, reason)` | `CERTIFICATE_ROLE` | Revoke with mandatory reason (FR-09) |
| `grantCertificateRole(address)` | `SUPERADMIN_ROLE` | Add a Registry Admin wallet |
| `revokeCertificateRole(address)` | `SUPERADMIN_ROLE` | Remove a Registry Admin wallet |
| `pause()` | `SUPERADMIN_ROLE` | Emergency: block issuance and revocation |
| `unpause()` | `SUPERADMIN_ROLE` | Resume normal operation |

---

## Environment variables (Next.js app)

Add these to your Vercel project settings after deployment:

| Variable | Description |
|----------|-------------|
| `CERTIFICATE_REGISTRY_ADDRESS` | Deployed contract address on Sepolia |
| `TEST_WALLET_PRIVATE_KEY` | Private key of a wallet with `CERTIFICATE_ROLE` |
| `TESTNET_RPC_URL` | Sepolia RPC endpoint (defaults to `https://rpc.sepolia.org`) |
| `SUPER_ADMIN_WALLETS` | Comma-separated admin wallet addresses for login |
| `JWT_SECRET` | Random secret for signing JWTs (generate with `openssl rand -hex 32`) |
