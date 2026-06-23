# NAUB Blockchain Certificate System

A blockchain-based academic certificate issuance and verification platform for the **Nigerian Army University Biu (NAUB)**, built as a final-year project.

**Live deployment:** [https://naub-blockchain-cert-system.vercel.app](https://naub-blockchain-cert-system.vercel.app)
**Smart contract:** [0xc1E131dA28e5828F303fa859934C90064c7e9005](https://sepolia.etherscan.io/address/0xc1E131dA28e5828F303fa859934C90064c7e9005) on Ethereum Sepolia

---

## What it does

The system allows the NAUB Registry to issue degree certificates that are:

- **Cryptographically hashed** — a SHA-256 hash of all eight certificate fields is computed in the browser before submission
- **Anchored on-chain** — the hash, an anonymised holder identity hash, and the IPFS document CID are permanently recorded in a smart contract on Ethereum Sepolia via MetaMask (Registry Admin pays real gas, creating an attributable, tamper-proof record)
- **Stored as real PDFs on IPFS** — a formal NAUB Statement of Result PDF is generated server-side and pinned to IPFS via Pinata at issuance time
- **Publicly verifiable** — anyone can verify a certificate by hash, certificate number, QR scan, or PDF upload at `/verify`, with no login or payment required
- **NDPR-compliant** — personal data lives only in MongoDB and can be permanently erased under Article 3.1(6); the on-chain record remains as an anonymous mathematical value

---

## Architecture

Three-tier decentralised application:

| Tier | Technology |
|------|-----------|
| Frontend | Next.js (React) — Vercel |
| Backend | Next.js API routes (Node.js) |
| Blockchain | Ethereum Sepolia — CertificateRegistry.sol (OpenZeppelin AccessControl + Pausable) |
| Off-chain storage | MongoDB Atlas |
| Document storage | IPFS via Pinata |
| Authentication | EIP-191 wallet signature + JWT |

---

## Smart contract

See [`contracts/README.md`](contracts/README.md) for the full Hardhat project guide.

- **38 unit tests** — all passing (deployment/roles, role management, issuance, verification, revocation, pausable controls)
- **Slither analysis** — 0 HIGH, 0 MEDIUM, 0 LOW findings in `CertificateRegistry.sol`
- **Deployed** on Ethereum Sepolia Testnet

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret for signing admin session JWTs |
| `CERTIFICATE_REGISTRY_ADDRESS` | Yes | Deployed contract address on Sepolia |
| `TEST_WALLET_PRIVATE_KEY` | Yes | Private key of the Registry Admin wallet |
| `TESTNET_RPC_URL` | Yes | Sepolia RPC endpoint (Alchemy/Infura) |
| `SUPER_ADMIN_WALLETS` | Yes | Comma-separated Super Admin wallet addresses |
| `REGISTRY_ADMIN_WALLETS` | Yes | Comma-separated Registry Admin wallet addresses |
| `PINATA_JWT` | Yes | Pinata JWT for pinning certificate PDFs to IPFS |

Copy `.env.example` to `.env.local` for local development.

---

## Running locally

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev

# Build for production
pnpm build
```

For the smart contract:
```bash
cd contracts
npm install
npm test           # Run the 38 unit tests
npm run deploy:sepolia   # Deploy to Ethereum Sepolia (needs .env)
```

---

## Portals

| Portal | URL | Access |
|--------|-----|--------|
| Landing page | `/` | Public |
| Public verification | `/verify` | Public (no login) |
| Holder portal | `/holder` | Public (no login) |
| Registry Admin login | `/admin` | MetaMask wallet |
| Admin dashboard | `/admin/dashboard` | Authenticated |
| Issue certificate | `/admin/dashboard/issue` | Authenticated |
| All certificates | `/admin/dashboard/certificates` | Authenticated |
