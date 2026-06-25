"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Shield,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Download,
  QrCode,
} from "lucide-react";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import { getRegistryContractAddress, revokeCertificateOnChain } from "@/lib/contract-client";
import type { Certificate } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { CertificateDisplayFormal } from "@/components/certificate-display-formal";
import { NaubBrand } from "@/components/naub-brand";

export default function CertificateDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeStatusMessage, setRevokeStatusMessage] = useState<string | null>(null);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");
  const [showErasureForm, setShowErasureForm] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [erasureMessage, setErasureMessage] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (params.id) {
      loadCertificate();
    }
  }, [params.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        setQrCodeDataUrl(canvas.toDataURL("image/png"));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [certificate]);

  const loadCertificate = async () => {
    try {
      const response = await fetch(`/api/certificates/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCertificate(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Certificate Page] Error:", errorData);
        toast({
          title: "Certificate Not Found",
          description: `Certificate ${params.id} could not be found`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Certificate Page] Error loading:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revocationReason.trim()) {
      toast({
        title: "Reason required",
        description: "A revocation reason is required and is permanently recorded on the blockchain (FR-09).",
        variant: "destructive",
      });
      return;
    }

    setIsRevoking(true);
    setRevokeStatusMessage(null);
    try {
      const contractAddress = await getRegistryContractAddress();
      let onChainTransactionHash: string | undefined;
      let onChainBlockNumber: number | undefined;

      if (contractAddress && certificate?.blockchainHash) {
        try {
          setRevokeStatusMessage("Waiting for you to confirm the revocation in MetaMask...");
          const result = await revokeCertificateOnChain(
            contractAddress,
            certificate.blockchainHash,
            revocationReason.trim(),
          );
          onChainTransactionHash = result.transactionHash;
          onChainBlockNumber = result.blockNumber;
          setRevokeStatusMessage("Transaction confirmed on Sepolia. Updating record...");
        } catch (chainError: any) {
          setIsRevoking(false);
          setRevokeStatusMessage(null);
          toast({
            title: "Transaction not completed",
            description:
              chainError?.message?.includes("rejected") || chainError?.code === 4001
                ? "You rejected the transaction in MetaMask. The certificate was not revoked."
                : chainError?.message || "The blockchain transaction failed.",
            variant: "destructive",
          });
          return;
        }
      }

      const response = await fetch(`/api/certificates/${params.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: revocationReason.trim(),
          onChainTransactionHash,
          onChainBlockNumber,
        }),
      });

      if (response.ok) {
        toast({
          title: "Certificate Revoked",
          description: "The certificate has been successfully revoked",
        });
        setShowRevokeForm(false);
        setRevocationReason("");
        loadCertificate();
      } else {
        const data = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: data.error || "Failed to revoke certificate",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRevoking(false);
      setRevokeStatusMessage(null);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${certificate?.id}-qr-code.png`;
      link.href = url;
      link.click();
    }
  };

  const handleErasure = async () => {
    if (!certificate) return;
    setIsErasing(true);
    setErasureMessage("");
    try {
      const response = await fetch("/api/certificates/erasure", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matriculationNumber: certificate.matriculationNumber,
          dateOfBirth: certificate.dateOfBirth,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setErasureMessage(
          `✓ ${data.message || "Personal data erased successfully. The on-chain hash record remains."}`
        );
      } else {
        setErasureMessage(data.error || "Erasure failed. Please try again.");
      }
    } catch {
      setErasureMessage("An error occurred during erasure. Please try again.");
    } finally {
      setIsErasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Certificate Not Found</CardTitle>
            <CardDescription>
              The requested certificate could not be found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verificationUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/verify?id=${certificate.id}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <NaubBrand subtitle="Certificate Details" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Status Banner */}
        <div className="mb-6">
          {certificate.status === "valid" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Certificate is Valid</p>
                <p className="text-sm text-green-700">This certificate is active and verified on the blockchain</p>
              </div>
            </div>
          )}
          {certificate.status === "revoked" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Certificate Revoked</p>
                <p className="text-sm text-red-700">This certificate has been revoked and is no longer valid</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 1. NAUB Certificate Output (top) ── */}
        <div className="mb-8">
          <CertificateDisplayFormal certificate={certificate} />
        </div>

        {/* ── 2. Blockchain Verification ── */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Blockchain Verification
              </CardTitle>
              <p className="text-sm text-muted-foreground">Immutable record on the Ethereum Sepolia blockchain</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Certificate Hash</p>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">{certificate.blockchainHash}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issuance Transaction</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">{certificate.transactionHash}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${certificate.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="icon" title="View on Etherscan">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Block: {certificate.blockNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Holder Identity Hash (NDPR-safe)</p>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">{certificate.holderIdentityHash}</p>
              </div>
              {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                <div>
                  <p className="text-sm text-muted-foreground">Certificate Document (IPFS)</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">{certificate.ipfsCid}</p>
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
              {certificate.status === "revoked" && certificate.revocationTxHash && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Revocation Transaction</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs break-all bg-red-50 p-2 rounded flex-1 border border-red-200">{certificate.revocationTxHash}</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${certificate.revocationTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="icon" title="View revocation on Etherscan">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Block: {certificate.revocationBlockNumber}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Revoked: {certificate.revokedAt ? new Date(certificate.revokedAt).toLocaleString() : "Unknown"}
                  </p>
                  {certificate.revocationReason && (
                    <p className="text-xs text-red-600 mt-1">Reason: {certificate.revocationReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 4. QR Code Verification ── */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Verification
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Scan to instantly verify this certificate - no login required
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-lg border-2 flex-shrink-0">
                  <QRCodeGenerator value={verificationUrl} size={200} />
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Anyone - employers, NYSC, other institutions - can scan this QR code or visit
                    the verification page to confirm this certificate's authenticity directly
                    against the Ethereum Sepolia blockchain. No login or account required.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDownloadQR}
                      className="gap-2 bg-transparent"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 5. Actions (Revoke + NDPR Erasure) ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {certificate.status === "valid" && !showRevokeForm && !showErasureForm && (
              <Button variant="destructive" onClick={() => setShowRevokeForm(true)}>
                Revoke Certificate
              </Button>
            )}
            {!showErasureForm && !showRevokeForm && (
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
                onClick={() => setShowErasureForm(true)}
              >
                Erase Personal Data (NDPR FR-16)
              </Button>
            )}
          </div>

          {showRevokeForm && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">Revoke Certificate</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Per FR-09, a reason is mandatory and will be permanently recorded on the blockchain.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., Issued in error - duplicate record; certificate replaced by NAUB/CERT/2026/0042"
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  rows={3}
                />
                {revokeStatusMessage && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
                    {revokeStatusMessage}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
                    {isRevoking ? "Revoking..." : "Confirm Revocation"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowRevokeForm(false); setRevocationReason(""); }}
                    disabled={isRevoking}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showErasureForm && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-700">Erase Personal Data (NDPR Article 3.1(6))</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This permanently deletes all personal data (name, date of birth,
                  matriculation number) from the off-chain database. The on-chain
                  hash record remains as an anonymous value - it cannot be erased
                  or modified.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <strong>This action is irreversible.</strong> Once personal data is
                  erased, it cannot be recovered. The certificate will no longer be
                  retrievable via the Holder Portal.
                </div>
                {erasureMessage && (
                  <div className={`rounded-lg p-3 text-sm ${erasureMessage.startsWith("✓") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {erasureMessage}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-orange-400 text-orange-700 hover:bg-orange-100 bg-transparent"
                    onClick={handleErasure}
                    disabled={isErasing}
                  >
                    {isErasing ? "Erasing..." : "Confirm Erasure"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowErasureForm(false); setErasureMessage(""); }}
                    disabled={isErasing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}