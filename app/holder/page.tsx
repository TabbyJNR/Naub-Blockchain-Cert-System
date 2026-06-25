"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NaubBrand } from "@/components/naub-brand";
import { canonicalHolderPayload, formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Search,
  UserRoundSearch,
  XCircle,
} from "lucide-react";

interface HolderCertificate {
  id: string;
  studentName: string;
  programmeOfStudy: string;
  classOfDegree?: string;
  dateOfAward?: string;
  matriculationNumber?: string;
  status: string;
  blockchainHash: string;
  transactionHash?: string;
  blockNumber?: number;
  ipfsCid?: string;
  certificateNumber?: string;
  revocationReason?: string;
}

async function sha256Hex(payload: string) {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function HolderPortalPage() {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [certificates, setCertificates] = useState<HolderCertificate[]>([]);
  const [identityHash, setIdentityHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setCertificates([]);

    try {
      const hash = await sha256Hex(canonicalHolderPayload(fullName.trim(), dateOfBirth));
      setIdentityHash(hash);
      const response = await fetch(`/api/certificates/holder/${hash}`);
      if (!response.ok) throw new Error("Lookup failed");
      const data = await response.json();
      setCertificates(data.certificates || []);
    } catch {
      setError("An error occurred during the lookup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const verificationUrl = (certificate: HolderCertificate) => {
    if (typeof window === "undefined") return `/verify?id=${certificate.id}`;
    return `${window.location.origin}/verify?id=${certificate.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/40">
      <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <NaubBrand subtitle="Holder Portal" />
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <UserRoundSearch className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="text-3xl font-bold">NAUB Certificate Holder Portal</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Retrieve your blockchain-verified degree certificate records by entering
            your registered name and date of birth.
          </p>
        </div>

        {/* Lookup form */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle>Find my certificates</CardTitle>
            <CardDescription>
              Your name and date of birth are hashed in your browser - they are never
              sent to the server in plain text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleLookup}
              className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (as registered)</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Yahaya Ibrahim"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="gap-2">
                <Search className="h-4 w-4" />
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </form>
            {identityHash && (
              <p className="mt-4 break-all rounded bg-muted p-3 font-mono text-xs text-muted-foreground">
                Holder identity hash: {identityHash}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-6 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* No results */}
        {hasSearched && !isLoading && !error && certificates.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <XCircle className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>No certificate records were found for that name and date of birth.</p>
              <p className="mt-1 text-sm">
                Check that the name and date of birth exactly match what was registered
                at NAUB.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="space-y-6">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="border-primary/15">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{certificate.studentName}</CardTitle>
                    <CardDescription className="mt-1">
                      {certificate.programmeOfStudy}
                      {certificate.classOfDegree ? ` - ${certificate.classOfDegree}` : ""}
                    </CardDescription>
                  </div>
                  <Badge className={getCertificateStatusColor(certificate.status)}>
                    {certificate.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Status banner */}
                {certificate.status === "valid" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    This certificate is valid and verified on the Ethereum Sepolia blockchain.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    This certificate has been revoked.
                    {certificate.revocationReason && ` Reason: ${certificate.revocationReason}`}
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Certificate No. (Ref. No)</p>
                    <p className="font-semibold">{certificate.certificateNumber || certificate.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Award</p>
                    <p className="font-semibold">
                      {certificate.dateOfAward ? formatDate(certificate.dateOfAward) : "Not recorded"}
                    </p>
                  </div>
                  {certificate.blockNumber && (
                    <div>
                      <p className="text-muted-foreground">Block Number</p>
                      <p className="font-mono font-semibold">{certificate.blockNumber}</p>
                    </div>
                  )}
                </div>

                {/* Hashes */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Certificate Hash (for verification)</p>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs">
                      {certificate.blockchainHash}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(certificate.blockchainHash, `hash-${certificate.id}`)}
                      title="Copy hash"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copied === `hash-${certificate.id}` && (
                    <p className="text-xs text-green-600">Copied!</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* Verify */}
                  <Link href={`/verify?id=${certificate.id}`}>
                    <Button size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Verify Certificate
                    </Button>
                  </Link>

                  {/* Copy verification link */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={() => copyToClipboard(verificationUrl(certificate), `link-${certificate.id}`)}
                  >
                    <QrCode className="h-4 w-4" />
                    {copied === `link-${certificate.id}` ? "Copied!" : "Copy Verification Link"}
                  </Button>

                  {/* Etherscan link */}
                  {certificate.transactionHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${certificate.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                        <ExternalLink className="h-4 w-4" /> View on Etherscan
                      </Button>
                    </a>
                  )}

                  {/* IPFS PDF */}
                  {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${certificate.ipfsCid.replace("ipfs://", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="secondary" className="gap-2">
                        <Download className="h-4 w-4" /> Download Certificate PDF
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
