"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import { QRScanner } from "@/components/qr-scanner";
import { NaubBrand } from "@/components/naub-brand";
import { CertificateDisplayFormal } from "@/components/certificate-display-formal";

interface PublicCertificate {
  id: string;
  programmeOfStudy: string;
  classOfDegree: string;
  dateOfAward: string;
  institutionName: string;
  certificateType: string;
  status: string;
  ipfsCid?: string;
  revocationReason?: string;
  revokedAt?: string;
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [certificateId, setCertificateId] = useState("");
  const [fieldHashNotice, setFieldHashNotice] = useState("");
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [blockchainInfo, setBlockchainInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setCertificateId(id);
      verifyById(id);
    }
  }, [searchParams]);

  const verifyById = async (id: string) => {
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setCertificate(null);
    setBlockchainInfo(null);

    try {
      const response = await fetch(`/api/verify/${id}`);

      if (response.ok) {
        const data = await response.json();
        setCertificate(data.certificate);
        setBlockchainInfo(data.blockchain);

        await fetch("/api/verify/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ certificateId: id }),
        });
      } else {
        const data = await response.json();
        setError(data.error || "Certificate not found");
      }
    } catch {
      setError("An error occurred while verifying the certificate");
    } finally {
      setIsSearching(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyById(certificateId.trim());
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => "");
    const hashMatch = text.match(/[a-f0-9]{64}/i);
    if (hashMatch) {
      setCertificateId(hashMatch[0]);
      verifyById(hashMatch[0]);
      setFieldHashNotice("Extracted a 64-character SHA-256 hash from the uploaded certificate file.");
    } else {
      setFieldHashNotice("No embedded hash was found in this demo PDF/text upload. Paste the certificate hash or scan its QR code.");
    }
  };

  const handleQRScan = (data: string) => {
    setShowScanner(false);
    try {
      const url = new URL(data);
      const id = url.searchParams.get("id");
      if (id) {
        setCertificateId(id);
        verifyById(id);
      }
    } catch {
      setCertificateId(data);
      verifyById(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NaubBrand subtitle="Public Certificate Verification" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/holder"><Button variant="ghost">Holder Portal</Button></Link>
            <Link href="/admin"><Button variant="ghost">Admin Login</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Search Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-balance">Verify a NAUB Degree Certificate</h2>
          <p className="text-lg text-muted-foreground text-balance">
            Submit a certificate hash, certificate number, field-derived hash, PDF-embedded hash, or QR code. No login, payment, or account is required.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste certificate hash, certificate number, or ID (e.g., NAUB-2026-000123)"
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={isSearching} className="gap-2">
                  <Search className="h-4 w-4" />
                  {isSearching ? "Verifying..." : "Verify"}
                </Button>
              </div>
              <div className="grid gap-3 rounded-lg border border-primary/10 bg-accent/40 p-4 md:grid-cols-4">
                <div className="flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4 text-primary" /> Direct paste</div>
                <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-primary" /> Field form hash</div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" /> PDF upload
                  <input type="file" accept=".pdf,.txt,.html" onChange={handlePdfUpload} className="sr-only" />
                </label>
                <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-2 text-sm font-medium text-left">
                  <QrCode className="h-4 w-4 text-primary" /> QR scan
                </button>
              </div>
              {fieldHashNotice && <p className="text-center text-sm text-muted-foreground">{fieldHashNotice}</p>}
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="gap-2 bg-transparent"
                >
                  <QrCode className="h-4 w-4" />
                  Scan QR Code
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && !isSearching && (
          <>
            {certificate ? (
              <div className="space-y-6">

                {/* Status banner */}
                <div className={`rounded-lg border p-4 flex items-center gap-3 ${
                  certificate.status === "revoked"
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200"
                }`}>
                  {certificate.status === "revoked"
                    ? <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    : <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  }
                  <div>
                    <p className={`font-semibold ${certificate.status === "revoked" ? "text-red-900" : "text-green-900"}`}>
                      {certificate.status === "revoked" ? "Certificate Revoked" : "Certificate is Valid"}
                    </p>
                    <p className={`text-sm ${certificate.status === "revoked" ? "text-red-700" : "text-green-700"}`}>
                      {certificate.status === "revoked"
                        ? `This certificate has been revoked${certificate.revocationReason ? `: ${certificate.revocationReason}` : ""}`
                        : "This certificate is authentic and verified on the Ethereum Sepolia blockchain"
                      }
                    </p>
                  </div>
                </div>

                {/* Formal certificate output */}
                <CertificateDisplayFormal certificate={certificate as any} />

                {/* Blockchain verification */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Blockchain Verification
                    </CardTitle>
                    <CardDescription>Cryptographic proof of authenticity on Ethereum Sepolia</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Certificate Hash</p>
                      <div className="bg-muted p-3 rounded font-mono text-xs break-all">
                        {blockchainInfo?.certificateHash}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Issuance Transaction</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted p-3 rounded font-mono text-xs break-all flex-1">
                          {blockchainInfo?.txHash}
                        </div>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${blockchainInfo?.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="icon" title="View on Etherscan">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Block: {blockchainInfo?.blockNumber}</p>
                    </div>
                    {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Certificate Document (IPFS)</p>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted p-2 rounded font-mono text-xs break-all flex-1">
                            {certificate.ipfsCid}
                          </div>
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${certificate.ipfsCid.replace("ipfs://", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="icon" title="View certificate PDF on IPFS">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                    {certificate.status === "revoked" && blockchainInfo?.revocationTxHash && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-1">Revocation Transaction</p>
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 p-3 rounded font-mono text-xs break-all flex-1 border border-red-200">
                            {blockchainInfo.revocationTxHash}
                          </div>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${blockchainInfo.revocationTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="icon" title="View revocation on Etherscan">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Certificate Not Found</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <p className="text-sm text-muted-foreground">
                      Please check the certificate ID and try again. If you believe this is an error, contact NAUB.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

        {/* Info Section (shown before any search) */}
        {!hasSearched && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Blockchain Secured</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every certificate is cryptographically secured and recorded on the blockchain for permanent verification.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle className="text-lg">Instant Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Verify any certificate in seconds with real-time blockchain validation and status checking.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertCircle className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg">Tamper-Proof</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Certificates cannot be forged or altered, ensuring complete trust in certificate holder credentials.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {showScanner && (
        <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
      )}

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Nigerian Army University Biu (NAUB)</p>
          <p className="mt-2">For support or inquiries, contact support@naub.edu.ng</p>
        </div>
      </footer>
    </div>
  );
}
