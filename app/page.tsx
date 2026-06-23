import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NaubBrand } from "@/components/naub-brand";
import {
  Database,
  FileCheck,
  GraduationCap,
  KeyRound,
  Lock,
  QrCode,
  Search,
  Shield,
  UserRoundSearch,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" aria-label="NAUB home">
            <NaubBrand subtitle="Blockchain Certificate System" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/holder">
              <Button variant="ghost" className="hidden sm:inline-flex">Holder Portal</Button>
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

        {/* Hero — reduced size, tight centered layout */}
        <section className="container mx-auto px-4 py-10 lg:py-16">
          <div className="mx-auto max-w-2xl space-y-5 text-center">
            <h2 className="text-balance text-3xl font-black leading-tight tracking-tight text-foreground md:text-4xl">
              Blockchain certificate management for trustworthy NAUB degree verification.
            </h2>
            <p className="text-balance text-base leading-7 text-muted-foreground md:text-lg">
              A three-tier decentralised application that protects NAUB academic
              certificates from forgery, insider manipulation, delayed registry
              confirmation, and unverifiable revocation.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row">
              <Link href="/verify">
                <Button size="default" className="w-full gap-2 sm:w-auto">
                  <Search className="h-4 w-4" />
                  Public Verification
                </Button>
              </Link>
              <Link href="/holder">
                <Button size="default" variant="outline" className="w-full gap-2 bg-white/70 sm:w-auto">
                  <UserRoundSearch className="h-4 w-4" />
                  Holder Portal
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="default" variant="secondary" className="w-full gap-2 sm:w-auto">
                  <Lock className="h-4 w-4" />
                  Registry Admin
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="container mx-auto grid gap-6 px-4 py-10 md:grid-cols-3">
          <Card className="border-primary/15">
            <CardHeader>
              <GraduationCap className="mb-3 h-10 w-10 text-primary" />
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
              <Database className="mb-3 h-10 w-10 text-primary" />
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
              <QrCode className="mb-3 h-10 w-10 text-primary" />
              <CardTitle>Independent verification</CardTitle>
              <CardDescription>
                Employers and institutions verify without accounts, payment, or registry
                letters — results come directly from the Ethereum Sepolia blockchain via
                a QR-linked verification URL or a direct hash / certificate ID lookup.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Stats banner */}
        <section className="container mx-auto px-4 py-10">
          <div className="overflow-hidden rounded-2xl bg-secondary text-secondary-foreground">
            <div className="grid gap-6 p-8 md:grid-cols-4 md:p-10">
              <div>
                <KeyRound className="mb-3 h-7 w-7 text-primary" />
                <div className="text-2xl font-black">RBAC</div>
                <p className="mt-1 text-sm text-secondary-foreground/75">
                  Super Admin and Registry Admin authority boundaries enforced by the
                  smart contract's AccessControl roles
                </p>
              </div>
              <div>
                <FileCheck className="mb-3 h-7 w-7 text-primary" />
                <div className="text-2xl font-black">SHA-256</div>
                <p className="mt-1 text-sm text-secondary-foreground/75">
                  Canonical certificate and holder identity hashes computed client-side
                  via the Web Crypto API before any data leaves the browser
                </p>
              </div>
              <div>
                <Shield className="mb-3 h-7 w-7 text-primary" />
                <div className="text-2xl font-black">IPFS</div>
                <p className="mt-1 text-sm text-secondary-foreground/75">
                  Certificate PDFs are generated and pinned to IPFS via Pinata at
                  issuance — the CID is anchored on-chain for permanent document proof
                </p>
              </div>
              <div>
                <Search className="mb-3 h-7 w-7 text-primary" />
                <div className="text-2xl font-black">≤2s</div>
                <p className="mt-1 text-sm text-secondary-foreground/75">
                  Target public verification response time under normal Sepolia network
                  conditions
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t mt-10">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Nigerian Army University Biu (NAUB)</p>
          <p className="mt-1">Blockchain Certificate System — Securing academic credential trust.</p>
        </div>
      </footer>

    </div>
  );
}
