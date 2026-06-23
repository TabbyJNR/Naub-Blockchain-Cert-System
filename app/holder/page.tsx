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
import { ArrowLeft, Copy, Download, ExternalLink, QrCode, Search, UserRoundSearch } from "lucide-react";

interface HolderCertificate {
  id: string;
  studentName: string;
  programmeOfStudy: string;
  classOfDegree?: string;
  dateOfAward?: string;
  status: string;
  blockchainHash: string;
  ipfsCid?: string;
  certificateNumber?: string;
}

async function sha256Hex(payload: string) {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function HolderPortalPage() {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [certificates, setCertificates] = useState<HolderCertificate[]>([]);
  const [identityHash, setIdentityHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    const hash = await sha256Hex(canonicalHolderPayload(fullName, dateOfBirth));
    setIdentityHash(hash);
    const response = await fetch(`/api/certificates/holder/${hash}`);
    const data = await response.json();
    setCertificates(data.certificates || []);
    setIsLoading(false);
  };

  const verificationUrl = (certificate: HolderCertificate) => {
    if (typeof window === "undefined") return `/verify?id=${certificate.id}`;
    return `${window.location.origin}/verify?id=${certificate.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/40">
      <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3"><NaubBrand subtitle="Holder Portal" /></Link>
          <Link href="/"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" /> Home</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 text-center">
          <UserRoundSearch className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="text-4xl font-bold">NAUB Certificate Holder Portal</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Graduates can retrieve blockchain-verified certificate records by entering their full name and date of birth. The browser creates the anonymised holder identity hash used for lookup.
          </p>
        </div>

        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle>Find my certificates</CardTitle>
            <CardDescription>No MetaMask wallet or blockchain knowledge is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
              <div className="space-y-2"><Label htmlFor="fullName">Full Name</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Amina Yusuf" required /></div>
              <div className="space-y-2"><Label htmlFor="dateOfBirth">Date of Birth</Label><Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required /></div>
              <Button type="submit" disabled={isLoading} className="gap-2"><Search className="h-4 w-4" />{isLoading ? "Searching..." : "Search"}</Button>
            </form>
            {identityHash && <p className="mt-4 break-all rounded bg-muted p-3 font-mono text-xs text-muted-foreground">Holder identity hash: {identityHash}</p>}
          </CardContent>
        </Card>

        {hasSearched && !isLoading && certificates.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No certificate records were found for that holder identity hash.</CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="border-primary/15">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{certificate.programmeOfStudy}</CardTitle>
                    <CardDescription>{certificate.classOfDegree || "Degree Certificate"}</CardDescription>
                  </div>
                  <Badge className={getCertificateStatusColor(certificate.status)}>{certificate.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground">Certificate No.</p><p className="font-semibold">{certificate.certificateNumber || certificate.id}</p></div>
                  <div><p className="text-muted-foreground">Date of Award</p><p className="font-semibold">{certificate.dateOfAward ? formatDate(certificate.dateOfAward) : "Not recorded"}</p></div>
                </div>
                <div><p className="text-muted-foreground">Verification Hash</p><p className="break-all font-mono text-xs">{certificate.blockchainHash}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent" onClick={() => navigator.clipboard.writeText(certificate.blockchainHash)}><Copy className="h-4 w-4" /> Copy Hash</Button>
                  <Link href={`/verify?id=${certificate.id}`}><Button size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Verify</Button></Link>
                  <Button size="sm" variant="secondary" className="gap-2" onClick={() => navigator.clipboard.writeText(verificationUrl(certificate))}><QrCode className="h-4 w-4" /> Copy Link</Button>
                  {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${certificate.ipfsCid.replace("ipfs://", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost" className="gap-2">
                        <Download className="h-4 w-4" /> View Certificate PDF
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
