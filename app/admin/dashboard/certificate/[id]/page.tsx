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
  Copy,
  Check,
  Clock,
  MapPin,
  Monitor,
  Activity,
} from "lucide-react";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import { getRegistryContractAddress, revokeCertificateOnChain } from "@/lib/contract-client";
import type { Certificate } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { CertificateDisplayFormal } from "@/components/certificate-display-formal";
import { CertificateDownload } from "@/components/certificate-download";
import { NaubBrand } from "@/components/naub-brand";
import { TypeToConfirm } from "@/components/type-to-confirm";
import { Breadcrumbs } from "@/components/breadcrumbs";

// ── ForensicLog entry type ─────────────────────────────────────────────────
interface ForensicEntry {
  _id: string;
  hashSubmitted: string;
  result: "VALID" | "REVOKED" | "NOT_FOUND";
  flagged: boolean;
  certificateId: string | null;
  ipAddress: string;
  city: string | null;
  country: string | null;
  isp: string | null;
  browser: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  timestamp: number;
  acknowledged: boolean;
}

// ── Certificate Audit Trail Component (FR-17) ──────────────────────────────
function CertificateAuditTrail({ certificateId }: { certificateId: string }) {
  const [entries, setEntries] = useState<ForensicEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/forensic-log?certificateId=${certificateId}&limit=100`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [certificateId]);

  const validCount = entries.filter((e) => e.result === "VALID").length;
  const suspiciousCount = entries.filter((e) => e.flagged).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Certificate Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Certificate Audit Trail
        </CardTitle>
        <CardDescription>
          Complete verification history for this certificate — every attempt logged
          by the Certificate Integrity Monitoring and Alert Service (CIMAS).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </div>
          <div className="rounded-lg border bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{validCount}</p>
            <p className="text-xs text-muted-foreground">Valid Verifications</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${suspiciousCount > 0 ? "bg-red-50" : "bg-muted/40"}`}>
            <p className={`text-2xl font-bold ${suspiciousCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {suspiciousCount}
            </p>
            <p className="text-xs text-muted-foreground">Suspicious Attempts</p>
          </div>
        </div>

        {/* Log entries */}
        {entries.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No verification attempts recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <AuditEntry key={entry._id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditEntry({ entry }: { entry: ForensicEntry }) {
  const time = new Date(entry.timestamp).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  const location = [entry.city, entry.country].filter(Boolean).join(", ") || "Unknown";
  const device = [entry.browser, entry.operatingSystem].filter(Boolean).join(" · ") || "Unknown device";

  const resultColor =
    entry.result === "VALID"
      ? "text-green-600 bg-green-50 border-green-200"
      : entry.result === "REVOKED"
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200";

  const resultIcon =
    entry.result === "VALID" ? "✓" :
    entry.result === "REVOKED" ? "⚠" : "⛔";

  return (
    <div className={`rounded-lg border p-3 text-xs ${entry.flagged ? "border-red-200 bg-red-50/50" : "border-border bg-muted/20"}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`font-bold px-1.5 py-0.5 rounded border text-[10px] ${resultColor}`}>
          {resultIcon} {entry.result}
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {time}
        </span>
      </div>
      <div className="space-y-0.5 text-muted-foreground">
        <p className="flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {location} · {entry.isp || "Unknown ISP"} · IP: {entry.ipAddress}
        </p>
        <p className="flex items-center gap-1">
          <Monitor className="h-3 w-3 flex-shrink-0" />
          {device}
        </p>
      </div>
      {entry.flagged && (
        <p className="mt-1.5 text-[10px] font-semibold text-red-600">
          ⚠ Flagged as suspicious — Super Admin was notified
        </p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

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
  const [copiedHash, setCopiedHash] = useState(false);
  const [erasureConfirmed, setErasureConfirmed] = useState(false);
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
          revokedBy: sessionStorage.getItem("naub_wallet") || undefined,
        }),
      });

      if (response.ok) {
        toast({ title: "Certificate Revoked", description: "The certificate has been successfully revoked" });
        setShowRevokeForm(false);
        setRevocationReason("");
        loadCertificate();
      } else {
        const data = await response.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to revoke certificate", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
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
        setErasureMessage(`✓ ${data.message || "Personal data erased successfully."}`);
        toast({ title: "Personal data erased", description: "NDPR Article 3.1(6) satisfied." });
        loadCertificate();
      } else {
        setErasureMessage(data.error || "Erasure failed.");
        toast({ title: "Erasure failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      setErasureMessage("Network error during erasure.");
    } finally {
      setIsErasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Link href="/admin/dashboard">
              <NaubBrand subtitle="Registry Admin Dashboard" />
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Certificate Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Certificate <code className="font-mono">{params.id as string}</code> could not be found.
          </p>
          <Link href="/admin/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const verificationUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify?id=${certificate.id}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <NaubBrand subtitle="Registry Admin Dashboard" />
          </Link>
          <Link href="/admin/dashboard">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Certificates", href: "/admin/dashboard/certificates" },
            { label: certificate.certificateNumber },
          ]}
          className="mb-6"
        />

        {/* Status Banner */}
        {certificate.status === "revoked" && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">This certificate has been revoked</p>
              {certificate.revocationReason && (
                <p className="text-sm text-red-600 mt-1">Reason: {certificate.revocationReason}</p>
              )}
              {certificate.revokedAt && (
                <p className="text-xs text-red-500 mt-1">
                  Revoked: {new Date(certificate.revokedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── 1. Certificate Details ── */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {certificate.certificateNumber}
                  </CardTitle>
                  <CardDescription>
                    {certificate.programmeOfStudy} · {certificate.institutionName}
                  </CardDescription>
                </div>
                <Badge className={getCertificateStatusColor(certificate.status)}>
                  {certificate.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {[
                  ["Student Name", certificate.studentName],
                  ["Matriculation Number", certificate.matriculationNumber],
                  ["Date of Birth", certificate.dateOfBirth],
                  ["Programme of Study", certificate.programmeOfStudy],
                  ["Class of Degree", certificate.classOfDegree],
                  ["Date of Award", formatDate(certificate.dateOfAward)],
                  ["Vice Chancellor", certificate.viceChancellor],
                  ["Date Issued", formatDate(certificate.dateIssued)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 2. Formal Certificate Preview ── */}
        <div className="mb-6">
          <CertificateDisplayFormal certificate={certificate} />
        </div>

        {/* ── 3. Blockchain Record ── */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Blockchain Record
              </CardTitle>
              <CardDescription>
                Permanently anchored on Ethereum Sepolia Testnet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Certificate Hash (SHA-256)</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">
                    {certificate.blockchainHash}
                  </p>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(certificate.blockchainHash);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                  >
                    {copiedHash ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Transaction Hash</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">
                    {certificate.transactionHash}
                  </p>
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

              {certificate.ipfsCid && !certificate.ipfsCid.startsWith("ipfs://demo-") && (
                <div>
                  <p className="text-sm text-muted-foreground">Certificate Document (IPFS)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">
                      {certificate.ipfsCid}
                    </p>
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
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-xs break-all bg-red-50 p-2 rounded flex-1 border border-red-200">
                      {certificate.revocationTxHash}
                    </p>
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

        {/* ── 4. Certificate Audit Trail (FR-17 — NEW) ── */}
        <div className="mb-6">
          <CertificateAuditTrail certificateId={certificate.id} />
        </div>

        {/* ── 5. QR Code ── */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Verification
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Scan to instantly verify this certificate — no login required
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-shrink-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-primary/15">
                  <div className="absolute -left-1 -top-1 h-4 w-4 rounded-tl-md border-l-2 border-t-2 border-primary/40" />
                  <div className="absolute -right-1 -top-1 h-4 w-4 rounded-tr-md border-r-2 border-t-2 border-primary/40" />
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 rounded-bl-md border-b-2 border-l-2 border-primary/40" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-br-md border-b-2 border-r-2 border-primary/40" />
                  <QRCodeGenerator value={verificationUrl} size={200} />
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Anyone — employers, NYSC, other institutions — can scan this QR code
                    or visit the verification page to confirm this certificate's authenticity
                    directly against the Ethereum Sepolia blockchain. No login or account required.
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

        {/* ── 6. Actions (Revoke + NDPR Erasure) ── */}
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
                  hash record remains as an anonymous value — it cannot be erased
                  or modified.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <strong>This action is irreversible.</strong> Once personal data is
                  erased, it cannot be recovered. The certificate will no longer be
                  retrievable via the Holder Portal by name and date of birth. The
                  certificate will continue to verify successfully on the public
                  /verify page and on Etherscan.
                </div>
                {erasureMessage && (
                  <div className={`rounded-lg p-3 text-sm ${
                    erasureMessage.startsWith("✓")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}>
                    {erasureMessage}
                  </div>
                )}
                <TypeToConfirm
                  confirmWord="ERASE"
                  onConfirmChange={setErasureConfirmed}
                  disabled={isErasing}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-orange-400 text-orange-700 hover:bg-orange-100 bg-transparent"
                    onClick={handleErasure}
                    disabled={isErasing || !erasureConfirmed}
                  >
                    {isErasing ? "Erasing..." : "Confirm Erasure"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowErasureForm(false); setErasureMessage(""); setErasureConfirmed(false); }}
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
