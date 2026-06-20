"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  canonicalCertificatePayload,
  canonicalHolderPayload,
  certificateCategories,
  degreeClasses,
  NAUB_VICE_CHANCELLOR_NAME,
} from "@/lib/certificate-utils";
import { getRegistryContractAddress, issueCertificateOnChain } from "@/lib/contract-client";
import { NaubBrand } from "@/components/naub-brand";
import {
  ArrowLeft,
  CheckCircle,
  Database,
  FileKey2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

async function sha256Hex(payload: string) {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function IssueCertificatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hashPreview, setHashPreview] = useState<{ certificateHash: string; holderIdentityHash: string } | null>(null);
  const [formData, setFormData] = useState({
    studentName: "",
    matriculationNumber: "",
    dateOfBirth: "",
    programmeOfStudy: "",
    classOfDegree: "",
    dateOfAward: "",
    certificateNumber: "",
    ipfsCid: "",
  });

  const requiredFields = [
    formData.studentName,
    formData.matriculationNumber,
    formData.dateOfBirth,
    formData.programmeOfStudy,
    formData.classOfDegree,
    formData.dateOfAward,
    formData.certificateNumber,
  ];

  const computeHashes = async () => {
    const missingRequired = requiredFields.some((value) => !value.trim());
    if (missingRequired) {
      toast({
        title: "Incomplete NAUB certificate fields",
        description: "Complete every Chapter 3 required certificate field before hashing.",
        variant: "destructive",
      });
      return null;
    }

    const certificateHash = await sha256Hex(
      canonicalCertificatePayload({ ...formData, viceChancellor: NAUB_VICE_CHANCELLOR_NAME }),
    );
    const holderIdentityHash = await sha256Hex(
      canonicalHolderPayload(formData.studentName, formData.dateOfBirth),
    );
    const hashes = { certificateHash, holderIdentityHash };
    setHashPreview(hashes);
    return hashes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const hashes = await computeHashes();
      if (!hashes) {
        setIsLoading(false);
        return;
      }

      // Pre-flight duplicate check — runs BEFORE requesting a MetaMask
      // transaction, so a Registry Admin is never asked to pay real
      // Sepolia gas for an issuance that would be rejected anyway.
      setStatusMessage("Checking matriculation number and certificate number are unique...");
      try {
        const dupCheckResponse = await fetch("/api/certificates/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matriculationNumber: formData.matriculationNumber,
            certificateNumber: formData.certificateNumber,
          }),
        });
        const dupCheckData = await dupCheckResponse.json();
        if (dupCheckData.duplicate) {
          setIsLoading(false);
          setStatusMessage(null);
          toast({
            title: "Duplicate identifier detected",
            description: dupCheckData.message,
            variant: "destructive",
          });
          return;
        }
      } catch (dupCheckError) {
        // If the duplicate check itself fails (e.g. network issue), don't
        // block issuance — the same check runs again server-side in
        // /api/certificates/issue as defense in depth. Still log it so a
        // pattern of failures here is visible during debugging.
        console.warn("[Issue] Pre-flight duplicate check failed, continuing:", dupCheckError);
      }
      setStatusMessage(null);

      const contractAddress = await getRegistryContractAddress();
      let onChainTransactionHash: string | undefined;
      let onChainBlockNumber: number | undefined;

      if (contractAddress) {
        try {
          setStatusMessage("Waiting for you to confirm the transaction in MetaMask...");
          const result = await issueCertificateOnChain(
            contractAddress,
            hashes.certificateHash,
            hashes.holderIdentityHash,
            formData.ipfsCid,
          );
          onChainTransactionHash = result.transactionHash;
          onChainBlockNumber = result.blockNumber;
          setStatusMessage("Transaction confirmed on Sepolia. Saving certificate record...");
        } catch (chainError: any) {
          setIsLoading(false);
          setStatusMessage(null);
          toast({
            title: "Transaction not completed",
            description:
              chainError?.message?.includes("rejected") || chainError?.code === 4001
                ? "You rejected the transaction in MetaMask. The certificate was not issued."
                : chainError?.message || "The blockchain transaction failed.",
            variant: "destructive",
          });
          return;
        }
      }

      const response = await fetch("/api/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...hashes,
          certificateType: "DEGREE",
          institutionName: "Nigerian Army University Biu",
          onChainTransactionHash,
          onChainBlockNumber,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast({
          title: "Certificate Issued Successfully",
          description: `Certificate hash anchored for ${data.certificate.certificateNumber}`,
        });
        setTimeout(() => {
          router.push(`/admin/dashboard/certificate/${data.certificate.id}`);
        }, 1000);
      } else if (onChainTransactionHash) {
        // The on-chain transaction already succeeded (real Sepolia gas was
        // spent) but saving the record failed — this needs to be loud and
        // specific, not a generic message, since the certificate now
        // exists on-chain without a matching database record.
        toast({
          title: "Transaction succeeded, but saving the record failed",
          description:
            `${data.error || "Unknown error"} — Your transaction was confirmed on Sepolia ` +
            `(hash: ${onChainTransactionHash.slice(0, 10)}...). Please save this transaction hash ` +
            `and contact support; do not retry issuing the same certificate.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Issuance Failed",
          description: data.error || `Request failed with status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message
          ? `An error occurred while issuing the certificate: ${error.message}`
          : "An unexpected error occurred while issuing the certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHashPreview(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/15 bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <NaubBrand title="Issue New Certificate" subtitle="Registry Admin • Chapter 3 FR-05 to FR-09" />
        </div>
      </header>

      <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>NAUB Degree Certificate Details</CardTitle>
            <CardDescription>
              Complete the eight academic fields specified in Chapter 3 before the browser computes the SHA-256 hashes and submits the registry transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="studentName">Student / Graduate Full Name *</Label>
                  <Input id="studentName" placeholder="e.g., Amina Yusuf" value={formData.studentName} onChange={(e) => handleChange("studentName", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matriculationNumber">Matriculation Number *</Label>
                  <Input id="matriculationNumber" placeholder="NAUB/UG/2020/0001" value={formData.matriculationNumber} onChange={(e) => handleChange("matriculationNumber", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programmeOfStudy">Programme of Study *</Label>
                  <Select value={formData.programmeOfStudy} onValueChange={(value) => handleChange("programmeOfStudy", value)} required>
                    <SelectTrigger id="programmeOfStudy"><SelectValue placeholder="Select programme" /></SelectTrigger>
                    <SelectContent>{certificateCategories.map((programme) => <SelectItem key={programme} value={programme}>{programme}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classOfDegree">Class of Degree *</Label>
                  <Select value={formData.classOfDegree} onValueChange={(value) => handleChange("classOfDegree", value)} required>
                    <SelectTrigger id="classOfDegree"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{degreeClasses.map((degreeClass) => <SelectItem key={degreeClass} value={degreeClass}>{degreeClass}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfAward">Date of Award *</Label>
                  <Input id="dateOfAward" type="date" value={formData.dateOfAward} onChange={(e) => handleChange("dateOfAward", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificateNumber">Certificate Number *</Label>
                  <Input id="certificateNumber" placeholder="NAUB/CERT/2026/0001" value={formData.certificateNumber} onChange={(e) => handleChange("certificateNumber", e.target.value)} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ipfsCid">IPFS CID / Pinata Reference</Label>
                  <Input id="ipfsCid" placeholder="Optional demo CID; backend will generate a placeholder if empty" value={formData.ipfsCid} onChange={(e) => handleChange("ipfsCid", e.target.value)} />
                </div>
              </section>

              <div className="rounded-lg border border-primary/20 bg-accent/60 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Client-side hashing and NDPR separation
                </div>
                <p className="text-muted-foreground">
                  The browser computes both the certificate hash and anonymised holder identity hash before submission. Only hash evidence and IPFS metadata are intended for blockchain anchoring; personal data remains off-chain.
                </p>
              </div>

              {hashPreview && (
                <div className="space-y-2 rounded-lg bg-secondary p-4 text-secondary-foreground">
                  <Badge className="bg-primary text-primary-foreground">SHA-256 Preview</Badge>
                  <p className="break-all font-mono text-xs">Certificate: {hashPreview.certificateHash}</p>
                  <p className="break-all font-mono text-xs">Holder: {hashPreview.holderIdentityHash}</p>
                </div>
              )}

              {statusMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" className="gap-2 bg-transparent" onClick={computeHashes}>
                  <FileKey2 className="h-4 w-4" />
                  Compute Hashes
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing Certificate...</> : "Issue and Anchor Certificate"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Chapter 3 Traceability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p><CheckCircle className="mr-2 inline h-4 w-4 text-primary" />FR-05 fields are captured in the issuance form.</p>
              <p><CheckCircle className="mr-2 inline h-4 w-4 text-primary" />FR-06 hashes are computed in the browser.</p>
              <p><CheckCircle className="mr-2 inline h-4 w-4 text-primary" />FR-07/FR-08 metadata includes IPFS CID, certificate type, institution, and timestamp.</p>
              <p><CheckCircle className="mr-2 inline h-4 w-4 text-primary" />NFR-07 keeps personally identifiable data off-chain.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
