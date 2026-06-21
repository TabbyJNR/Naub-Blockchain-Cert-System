import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  UserRoundSearch,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,oklch(0.35_0.11_38/0.14),transparent_34%),linear-gradient(180deg,white,oklch(0.97_0.01_45))]">
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
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="mx-auto max-w-3xl space-y-7 text-center">
            <div className="space-y-5">
              <h2 className="text-balance text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl">
                Blockchain certificate management for trustworthy NAUB degree verification.
              </h2>
              <p className="text-balance text-lg leading-8 text-muted-foreground md:text-xl">
                A three-tier decentralised application that protects NAUB academic certificates from forgery, insider manipulation, delayed registry confirmation, and unverifiable revocation.
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

        <section className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-3">
          <Card className="border-primary/15">
            <CardHeader>
              <GraduationCap className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>Academic certificate fields</CardTitle>
              <CardDescription>
                Captures student name, matriculation number, date of birth, programme, class of degree, award date, certificate number, and Vice Chancellor.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/15">
            <CardHeader>
              <Database className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>On-chain / off-chain split</CardTitle>
              <CardDescription>
                Only hashes, certificate type, institution, timestamp, and IPFS CID are anchored on-chain; personal data remains deletable off-chain for NDPR compliance.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/15">
            <CardHeader>
              <QrCode className="mb-4 h-11 w-11 text-primary" />
              <CardTitle>Independent verification</CardTitle>
              <CardDescription>
                Employers and institutions verify without accounts, payment, or registry letters using public blockchain evidence and QR-linked verification URLs.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="container mx-auto px-4 py-12">
          <Card className="overflow-hidden border-0 bg-secondary text-secondary-foreground">
            <CardContent className="grid gap-6 p-8 md:grid-cols-4 md:p-10">
              <div>
                <KeyRound className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">RBAC</div>
                <p className="text-sm text-secondary-foreground/75">Super Admin and Registry Admin authority boundaries</p>
              </div>
              <div>
                <FileCheck className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">SHA-256</div>
                <p className="text-sm text-secondary-foreground/75">Canonical certificate and holder identity hashes</p>
              </div>
              <div>
                <Database className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">IPFS</div>
                <p className="text-sm text-secondary-foreground/75">Content-addressed certificate PDF reference</p>
              </div>
              <div>
                <Search className="mb-3 h-8 w-8 text-primary" />
                <div className="text-3xl font-black">≤2s</div>
                <p className="text-sm text-secondary-foreground/75">Target verification response under normal network conditions</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-primary/15 bg-background">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Nigerian Army University Biu (NAUB)</p>
          <p className="mt-2">Blockchain Certificate System — Securing academic credential trust.</p>
        </div>
      </footer>
    </div>
  );
}
