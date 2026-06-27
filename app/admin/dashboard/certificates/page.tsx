"use client";

import { useEffect, useState } from "react";
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
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  FileCheck,
  LogOut,
} from "lucide-react";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import type { Certificate } from "@/lib/database";
import { useRouter } from "next/navigation";
import { NaubBrand } from "@/components/naub-brand";

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const storedRole = sessionStorage.getItem("naub_role") || "";
    setRole(storedRole);
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      const role = sessionStorage.getItem("naub_role") || "";
      const wallet = sessionStorage.getItem("naub_wallet") || "";
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (wallet) params.set("wallet", wallet);
      const res = await fetch(`/api/certificates?${params.toString()}`);
      if (res.ok) setCertificates(await res.json());
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.programmeOfStudy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <NaubBrand subtitle={role === "superadmin" ? "All Certificates" : "My Issued Certificates"} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard/issue">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Issue Certificate
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>All Certificates</CardTitle>
                <CardDescription>
                  {certificates.length} total · {certificates.filter((c) => c.status === "valid").length} valid ·{" "}
                  {certificates.filter((c) => c.status === "revoked").length} revoked
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadCertificates} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by ID, student name, or programme..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-4 font-medium">Certificate ID</th>
                        <th className="text-left p-4 font-medium">Student / Graduate Name</th>
                        <th className="text-left p-4 font-medium">Programme of Study</th>
                        <th className="text-left p-4 font-medium">Issue Date</th>
                        <th className="text-left p-4 font-medium">Date of Award</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        {role === "superadmin" && <th className="text-left p-4 font-medium">Issued By</th>}
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className="border-t hover:bg-muted/50">
                          <td className="p-4 font-mono text-sm">{cert.id}</td>
                          <td className="p-4">{cert.studentName}</td>
                          <td className="p-4 text-sm text-muted-foreground">{cert.programmeOfStudy}</td>
                          <td className="p-4 text-sm">{formatDate(cert.dateIssued)}</td>
                          <td className="p-4 text-sm">{formatDate(cert.dateOfAward || cert.dateIssued)}</td>
                          <td className="p-4">
                            <Badge className={getCertificateStatusColor(cert.status)}>
                              {cert.status}
                            </Badge>
                          </td>
                          {role === "superadmin" && (
                            <td className="p-4 font-mono text-xs text-muted-foreground">
                              {cert.issuedBy
                                ? `${cert.issuedBy.slice(0, 6)}...${cert.issuedBy.slice(-4)}`
                                : "-"}
                            </td>
                          )}
                          <td className="p-4">
                            <Link href={`/admin/dashboard/certificate/${cert.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!isLoading && filteredCertificates.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No certificates found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
