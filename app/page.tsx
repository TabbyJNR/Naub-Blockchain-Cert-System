import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NaubBrand } from "@/components/naub-brand";
import {
  ArrowRight,
  Database,
  FileCheck,
  GraduationCap,
  KeyRound,
  Lock,
  QrCode,
  Search,
  Shield,
  UserRoundSearch,
  Blocks,
  FileLock2,
  Globe,
} from "lucide-react";

// Live stats are fetched server-side so they always reflect the real
// current state of the database — no loading spinner, no client-side
// fetch needed for a public landing page.
async function getLiveStats() {
  try {
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/admin/analytics`, {
      next: { revalidate: 60 }, // refresh at most every 60s
    });
    if (res.ok) {
      const data = await res.json();
      return {
        totalCertificates: data.totalCertificates ?? 0,
        totalVerifications: data.totalVerifications ?? 0,
      };
    }
  } catch {
    // Silently fall back to zeros if the DB is unreachable at build time
  }
  return { totalCertificates: 0, totalVerifications: 0 };
}

export default async function HomePage() {
  const stats = await getLiveStats();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,oklch(0.35_0.11_38/0.14),transparent_34%),linear-gradient(180deg,white,oklch(0.97_0.01_45))]">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" aria-label="NAUB home">
            <NaubBrand subtitle="Blockchain Certificate System" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/holder">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Holder Portal
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline">Verify</Button>
            </Link>
            <Link href="/admin">
              <Button>Registry Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 pb-8 pt-16 lg:pt-24">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <div className="space-y-5">
              <h2 className="text-balance text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl">
                Blockchain certificate management for trustworthy NAUB degree verification.
              </h2>
              <p className="text-balance text-lg leading-8 text-muted-foreground md:text-xl">
                A three-tier decentralised application that protects NAUB academic
                certificates from forgery, insider manipulation, delayed registry
                confirmation, and unverifiable revocation.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/verify">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  <Search className="h-5 w-5" />
                  Public Verification
                </Button>
              </Link>
              <Link href="/holder">
                <Button size="lg" variant="outline" className="w-full gap-2 bg-white/70 sm:w-auto">
                  <UserRoundSearch className="h-5 w-5" />
                  Holder Portal
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                  <Lock className="h-5 w-5" />
                  Registry Admin
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Live stats strip ───────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 rounded-2xl border border-primary/15 bg-background/80 px-8 py-6 shadow-sm sm:flex-row sm:gap-12">
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-primary">
                {stats.totalCertificates}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Certificates issued</p>
            </div>
            <div className="hidden h-10 w-px bg-border sm:block" />
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-primary">
                {stats.totalVerifications}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Verifications performed</p>
            </div>
            <div className="hidden h-10 w-px bg-border sm:block" />
            <div className="text-center">
              <div className="text-4xl font-black text-primary">Sepolia</div>
              <p className="mt-1 text-sm text-muted-foreground">Deployed on Ethereum</p>
            </div>
          </div>
        </section>

        {/* ── Inline quick-verify ───────────────────────────────────── */}
        <section className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/15 bg-background/80 p-6 shadow-sm">
            <p className="mb-3 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Certificate Verification
            </p>
            <form
              action="/verify"
              method="get"
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                name="id"
                placeholder="Paste certificate hash, ID, or Ref. No (e.g. NAUB/CERT/2026/001)"
                className="flex-1"
              />
              <Button type="submit" className="gap-2 sm:w-auto">
                <Search className="h-4 w-4" />
                Verify
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No login, account, or payment required — results are read directly from the Ethereum blockchain.
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-12">
          <h3 className="mb-10 text-center text-2xl font-bold tracking-tight">
            How it works
          </h3>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-xl border border-primary/15 bg-background/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileLock2 className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Step 1
              </div>
              <h4 className="mb-2 font-bold">Issue</h4>
              <p className="text-sm text-muted-foreground">
                The Registry Admin fills in the eight required certificate fields. The
                browser computes a SHA-256 hash. A PDF is generated and pinned to IPFS.
                The hash is anchored to the Ethereum Sepolia blockchain via MetaMask —
                paying real gas, creating a permanent immutable record.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden items-center justify-center md:flex">
              <ArrowRight className="h-8 w-8 text-primary/30" />
            </div>

            {/* Step 2 */}
            <div className="relative rounded-xl border border-primary/15 bg-background/80 p-6 text-center shadow-sm md:col-start-3">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Step 2
              </div>
              <h4 className="mb-2 font-bold">Verify</h4>
              <p className="text-sm text-muted-foreground">
                Anyone — an employer, NYSC, another institution — pastes the certificate
                hash, scans a QR code, or uploads the PDF. The system reads the result
                directly from the blockchain. No login, no payment, no registry letter.
              </p>
            </div>
          </div>

          {/* Middle step sits below the arrow row on its own */}
          <div className="mx-auto mt-4 max-w-sm">
            <div className="relative rounded-xl border border-primary/15 bg-background/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Blocks className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                On-chain
              </div>
              <h4 className="mb-2 font-bold">Blockchain record</h4>
              <p className="text-sm text-muted-foreground">
                The SHA-256 certificate hash, holder identity hash, and IPFS CID are
                permanently stored in the CertificateRegistry smart contract on Ethereum
                Sepolia. Personal data stays in MongoDB — deletable for NDPR compliance.
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature cards ───────────────────────────────────────────── */}
        <section className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-3">
          <Card className="border-primary/15">
            <CardHeader>
              <GraduationCap className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>Academic certificate fields</CardTitle>
              <CardDescription>
                Captures all eight required fields: student name, matriculation number,
                date of birth, programme of study, class of degree, date of award,
                certificate number, and Vice Chancellor — matching the official NAUB
                Statement of Result format.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/15">
            <CardHeader>
              <Database className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>On-chain / off-chain split</CardTitle>
              <CardDescription>
                Only SHA-256 hashes and the IPFS document CID are anchored on-chain.
                Personal data lives in MongoDB and can be permanently erased under NDPR
                Article 3.1(6) without affecting the immutable on-chain record.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/15">
            <CardHeader>
              <QrCode className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>Independent verification</CardTitle>
              <CardDescription>
                Employers and institutions verify without accounts, payment, or registry
                letters — results come directly from the Ethereum Sepolia blockchain via
                a QR-linked verification URL or a direct hash / certificate ID lookup.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* ── Stats banner ────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-12">
          <Card className="overflow-hidden border-0 bg-secondary text-secondary-foreground">
            <CardContent className="grid gap-6 p-8 md:grid-cols-4 md:p-10">
              <div>
                <KeyRound className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">RBAC</div>
                <p className="text-sm text-secondary-foreground/75">
                  Super Admin and Registry Admin authority boundaries enforced by the
                  smart contract's AccessControl roles
                </p>
              </div>
              <div>
                <FileCheck className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">SHA-256</div>
                <p className="text-sm text-secondary-foreground/75">
                  Canonical certificate and holder identity hashes computed client-side
                  via the Web Crypto API before any data leaves the browser
                </p>
              </div>
              <div>
                <Shield className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">IPFS</div>
                <p className="text-sm text-secondary-foreground/75">
                  Certificate PDFs are generated and pinned to IPFS via Pinata at
                  issuance — the CID is anchored on-chain for permanent document proof
                </p>
              </div>
              <div>
                <Search className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">≤2s</div>
                <p className="text-sm text-secondary-foreground/75">
                  Target public verification response time under normal Sepolia network
                  conditions
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-primary/15 bg-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <NaubBrand subtitle="Blockchain Certificate System" />
              <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                Securing academic credential trust for Nigerian Army University Biu
                graduates since 2026.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:items-end">
              <div className="flex gap-4">
                <Link href="/verify" className="hover:text-foreground transition-colors">
                  Verify a certificate
                </Link>
                <Link href="/holder" className="hover:text-foreground transition-colors">
                  Holder portal
                </Link>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Registry login
                </Link>
              </div>
              <a
                href={`https://sepolia.etherscan.io/address/${process.env.CERTIFICATE_REGISTRY_ADDRESS || "0xc1E131dA28e5828F303fa859934C90064c7e9005"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:text-foreground transition-colors"
              >
                Contract: {(process.env.CERTIFICATE_REGISTRY_ADDRESS || "0xc1E131dA28e5828F303fa859934C90064c7e9005").slice(0, 10)}…
              </a>
              <p className="text-xs">© 2026 Nigerian Army University Biu (NAUB)</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
