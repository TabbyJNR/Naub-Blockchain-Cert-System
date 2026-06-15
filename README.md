# NAUB Blockchain Certificate System (Final Year Project)

A blockchain-based certificate issuance and verification platform designed as a final year project for Nigerian Army University Biu (NAUB). The system demonstrates how academic credentials can be issued, anchored, verified, and revoked using a privacy-aware DApp architecture deployed on Vercel.

## 1) Project Overview

The project addresses four institutional problems commonly found in manual certificate systems:

- physical certificate forgery,
- insider manipulation risks in centralized records,
- slow and costly manual verification,
- and weak certificate revocation lifecycle management.

The proposed solution combines:

- Ethereum-compatible smart contracts for immutable trust and role enforcement,
- SHA-256 hashing for tamper-evident certificate fingerprints,
- IPFS/Pinata-ready document storage references,
- a web-based DApp interface built with Next.js,
- NDPR-aligned off-chain personal data handling,
- and Vercel hosting for the production web application.

## 2) Product Vision

Build a secure, auditable, and NDPR-aligned digital certificate platform where:

- authorized university officials issue certificates,
- students and graduates access shareable verification links,
- and employers, institutions, or public users verify authenticity instantly and freely.

### Core Product Outcomes

- Instant public verification with a target perceived response time of two seconds or less for common lookups.
- Tamper evidence through deterministic hashing and blockchain anchoring.
- Administrative control through role-based access and revocation workflows.
- Privacy alignment by keeping personally identifiable information off-chain.

## 3) Functional Requirements

### 3.1 Identity, Access, and Roles

1. The system supports Super Admin, Registry Admin, Holder, and Public Verifier roles.
2. The system enforces least-privilege permissions for each role.
3. Privileged operations such as issue, revoke, pause, unpause, and grant-role require authenticated administrative access and wallet ownership proof where applicable.

### 3.2 Certificate Issuance

4. Registry Admins create certificate records using structured academic fields such as holder profile, department, programme, class of degree, graduation year, and institutional metadata.
5. The system canonicalizes certificate fields and generates a deterministic SHA-256 fingerprint.
6. The system can generate a certificate document and store document references off-chain.
7. The system records immutable identifiers such as the certificate hash and reference metadata on-chain.
8. The system returns a verifiable certificate ID and QR-ready verification link after finalization.

### 3.3 Verification

9. Public users verify by certificate ID, QR code, or reconstructed certificate data.
10. The system recomputes and compares the certificate hash with the anchored blockchain state.
11. Verification states are displayed clearly as Valid, Revoked, Not Found, or Mismatch.
12. Public verification uses read-only blockchain calls, so verifiers do not pay transaction fees.

### 3.4 Revocation and Lifecycle

13. Authorized admins can revoke a certificate with an auditable reason and timestamp.
14. Verification responses always reflect current revocation state.
15. Revoked credentials remain auditable and are not deleted from the chain.

### 3.5 Holder Portal

16. Holders can access certificate lists and verification links.
17. Holders can view issuance status, revocation state, and certificate provenance.
18. Holders can request NDPR-related off-chain data actions through governed workflows.

### 3.6 Administration and Governance

19. Super Admins manage registry admins and governance settings.
20. Super Admins can activate emergency pause/unpause workflows for incident containment.
21. The platform correlates on-chain transactions with off-chain audit logs.

### 3.7 Reporting and Analytics

22. Admin dashboards show issuance counts, verification volume, certificate status trends, and security anomalies.
23. Analytics should minimize PII exposure and prefer aggregation.

## 4) Non-Functional Requirements

### Security

- Smart contract controls include role gates, pausability, and secure modifiers.
- Backend routes apply authentication, authorization, validation, and anti-abuse checks.
- Secrets such as RPC URLs, Pinata keys, Gemini keys, and wallet private keys are stored as Vercel environment variables.
- Recommended checks include unit tests, integration tests, dependency scanning, and smart contract static analysis.

### Privacy and NDPR Compliance

- No personally identifiable information is stored on-chain.
- Off-chain schemas apply data minimization and purpose limitation.
- Off-chain personal data can be corrected or erased through governed workflows while preserving non-PII blockchain evidence.
- Access logs support accountability and compliance reviews.

### Performance and Reliability

- Public verification targets a perceived response time of two seconds or less.
- Blockchain write flows should use idempotency and retry/backoff patterns.
- The UI should degrade gracefully during RPC latency or testnet outages.
- Vercel provides globally distributed hosting for the Next.js frontend and API routes.

### Maintainability

- Code is organized into UI, API routes, storage, certificate utilities, AI helpers, and blockchain adapter modules.
- Contract ABI changes should be versioned.
- CI/CD should run linting, type checks, and production builds before deployment.

## 5) Current Application Features

- Public certificate verification page.
- Admin login and certificate management dashboard.
- Certificate issuance form with deterministic certificate IDs.
- Blockchain transaction/hash fields for anchored records.
- Revocation workflow and status-aware verification.
- QR code support for certificate sharing.
- AI-assisted verification summaries, dashboard insights, certificate support guidance, and anomaly review with fallback text when no API key is configured.

## 6) Vercel Deployment Blueprint

### Prerequisites

- Node.js 20 or later.
- pnpm installed locally.
- A Vercel account connected to this Git repository.
- Environment variables for any live integrations you enable.

### Recommended Vercel Environment Variables

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
RPC_URL=your_ethereum_or_polygon_rpc_url
PRIVATE_KEY=issuer_wallet_private_key_for_demo_only
CONTRACT_ADDRESS=deployed_contract_address
PINATA_JWT=your_pinata_jwt_if_ipfs_uploads_are_enabled
ADMIN_USERNAME=admin@naub.edu.ng
ADMIN_PASSWORD=change_this_password
```

> Do not commit real secrets. Configure them in the Vercel Project Settings environment variable panel.

### Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` and use the public verification or admin portal.

### Production Build

```bash
pnpm build
```

### Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Select the Next.js framework preset.
4. Set the install command to `pnpm install` if Vercel does not detect pnpm automatically.
5. Set the build command to `pnpm build`.
6. Add the environment variables listed above.
7. Deploy and test the `/verify` and `/admin` routes.

## 7) Research Alignment

This implementation supports a final year project narrative by mapping the research problem to a working prototype:

- Chapter 1 problem statement maps to certificate forgery, slow verification, insider manipulation, and revocation gaps.
- Chapter 2 literature review maps to blockchain immutability, cryptographic hashing, and decentralized verification.
- Chapter 3 methodology maps to the system architecture, role model, data flow, and prototype implementation.
- The deployed application demonstrates issuance, verification, auditability, and revocation as proof-of-concept outcomes.

## 8) Demo Certificate IDs

Sample development records use IDs such as:

- `NAUB-2024-001`
- `NAUB-2024-002`

Use these IDs on the verification page after sample data initializes.

## 9) Project Status

This is a final year project prototype. Before institutional production use, complete smart contract audits, security hardening, NDPR legal review, production database integration, role-based wallet signing, and formal deployment approvals.

---

**Built for NAUB final year project demonstration — securing academic credential trust with blockchain.**
