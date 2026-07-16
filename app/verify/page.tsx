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
  ExternalLink,
  QrCode,
  Database,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import { QRScanner } from "@/components/qr-scanner";
import { NaubBrand } from "@/components/naub-brand";
import { CertificateDisplayFormal } from "@/components/certificate-display-formal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { InfoTooltip } from "@/components/info-tooltip";

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
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [blockchainInfo, setBlockchainInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

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

  const handleCopyHash = async () => {
    if (!blockchainInfo?.certificateHash) return;
    await navigator.clipboard.writeText(blockchainInfo.certificateHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
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
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        Certificate Hash
                        <InfoTooltip text="A unique digital fingerprint created from this certificate's details using SHA-256, a one-way cryptographic function. It cannot be reversed to reveal personal information, and it changes completely if even one character of the certificate is altered." />
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted p-3 rounded font-mono text-xs break-all flex-1">
                          {blockchainInfo?.certificateHash}
                        </div>
                        <Button variant="outline" size="icon" onClick={handleCopyHash} title="Copy certificate hash" className="flex-shrink-0">
                          {copiedHash ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        Issuance Transaction
                        <InfoTooltip text="The unique identifier of the blockchain transaction that permanently recorded this certificate on Ethereum. Click 'View on Etherscan' below to see it on the public blockchain explorer." />
                      </p>
                      <div className="bg-muted p-3 rounded font-mono text-xs break-all">
                        {blockchainInfo?.txHash}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Block: {blockchainInfo?.blockNumber}</p>
                    </div>

                    {/* Prominent Etherscan button */}
                    {blockchainInfo?.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${blockchainInfo.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full gap-2" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                          View this transaction on Etherscan (Ethereum Sepolia)
                        </Button>
                      </a>
                    )}
                    {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          Certificate Document (IPFS)
                          <InfoTooltip text="IPFS (InterPlanetary File System) stores the actual certificate PDF on a decentralised network rather than a single company's server, so the document stays permanently accessible even if NAUB's website is ever offline." />
                        </p>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <ScrollReveal delayMs={0}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2 transition-transform duration-300 group-hover:scale-110" />
                  <CardTitle className="text-lg">Blockchain Secured</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every certificate hash is anchored on the Ethereum Sepolia blockchain and independently verifiable on Etherscan.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delayMs={100}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-green-600 mb-2 transition-transform duration-300 group-hover:scale-110" />
                  <CardTitle className="text-lg">Instant Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Results return in approximately two seconds, with no login, account, or payment required.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delayMs={200}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <Database className="h-10 w-10 text-blue-600 mb-2 transition-transform duration-300 group-hover:scale-110" />
                  <CardTitle className="text-lg">IPFS Document Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The certificate PDF is pinned to IPFS via Pinata at issuance, giving it a permanent, tamper-evident document reference.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delayMs={300}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <Lock className="h-10 w-10 text-purple-600 mb-2 transition-transform duration-300 group-hover:scale-110" />
                  <CardTitle className="text-lg">NDPR Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Personal data never touches the blockchain. Only cryptographic hashes are recorded, keeping the system compliant with Nigerian data protection law.
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        )}
      </div>

      {showScanner && (
        <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
      )}

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Nigerian Army University Biu (NAUB)</p>
          <p className="mt-2">For support or inquiries, contact support@naub.edu.ng</p>
        </div>
      </footer>
    </div>
  );
}
