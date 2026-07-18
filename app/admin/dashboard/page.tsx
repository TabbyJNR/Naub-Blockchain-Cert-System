"use client";

import { useEffect, useState } from "react";
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
import {
  Shield,
  FileCheck,
  AlertCircle,
  Plus,
  LogOut,
  Activity,
  Users,
  BarChart3,
  ArrowLeft,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  UserPlus,
  UserMinus,
  KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getRegistryContractAddress,
  grantCertificateRoleOnChain,
  revokeCertificateRoleOnChain,
  pauseContractOnChain,
  unpauseContractOnChain,
  isContractPaused,
} from "@/lib/contract-client";
import { Badge } from "@/components/ui/badge";
import type { Certificate } from "@/lib/database";
import { formatDate, getCertificateStatusColor } from "@/lib/certificate-utils";
import { NaubBrand } from "@/components/naub-brand";

interface Analytics {
  totalCertificates: number;
  validCertificates: number;
  revokedCertificates: number;
  totalVerifications: number;
  activeCertificateHolders: number;
  recentCertificates: Certificate[];
  recentVerifications: Array<{
    id: string;
    certificateId: string;
    timestamp: number;
  }>;
  registryAdminActivity: Record<string, { issued: number; lastActive: string }> | null;
}

/**
 * AdminControlPanel - Role Management and System Pause.
 * Only shown to wallets with SUPERADMIN_ROLE (stored as "superadmin"
 * in sessionStorage after login). Registry Admins ("admin" role) see
 * this section as read-only, showing current status only.
 */
function AdminControlPanel() {
  const role =
    typeof window !== "undefined" ? sessionStorage.getItem("naub_role") : null;
  const isSuperAdmin = role === "superadmin";
  const { toast } = useToast();

  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [newAdminWallet, setNewAdminWallet] = useState("");
  const [revokeAdminWallet, setRevokeAdminWallet] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    getRegistryContractAddress().then((addr) => {
      setContractAddress(addr);
      if (addr) isContractPaused(addr).then(setIsPaused).catch(() => setIsPaused(false));
    });
  }, []);

  const handlePauseToggle = async () => {
    if (!contractAddress) return;
    setPauseLoading(true);
    try {
      if (isPaused) {
        await unpauseContractOnChain(contractAddress);
        setIsPaused(false);
        toast({
          title: "System unpaused",
          description: "Certificate issuance and revocation are now enabled.",
        });
      } else {
        await pauseContractOnChain(contractAddress);
        setIsPaused(true);
        toast({
          title: "System paused",
          description: "Certificate issuance and revocation are now blocked on-chain.",
        });
      }
    } catch (err: any) {
      if (err?.message?.includes("rejected") || err?.code === 4001) {
        toast({ title: "Transaction rejected in MetaMask", description: "No change was made.", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: err?.message || "Unknown error", variant: "destructive" });
      }
    } finally {
      setPauseLoading(false);
    }
  };

  const handleGrantRole = async () => {
    if (!contractAddress || !newAdminWallet.trim()) return;
    setRoleLoading(true);
    try {
      await grantCertificateRoleOnChain(contractAddress, newAdminWallet.trim());
      toast({
        title: "Role granted",
        description: `CERTIFICATE_ROLE granted to ${newAdminWallet.trim()}. They can now issue and revoke certificates.`,
      });
      setNewAdminWallet("");
    } catch (err: any) {
      if (err?.message?.includes("rejected") || err?.code === 4001) {
        toast({ title: "Transaction rejected in MetaMask", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: err?.message || "Unknown error", variant: "destructive" });
      }
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRevokeRole = async () => {
    if (!contractAddress || !revokeAdminWallet.trim()) return;
    setRoleLoading(true);
    try {
      await revokeCertificateRoleOnChain(contractAddress, revokeAdminWallet.trim());
      toast({
        title: "Role revoked",
        description: `CERTIFICATE_ROLE revoked from ${revokeAdminWallet.trim()}. They can no longer issue or revoke certificates.`,
      });
      setRevokeAdminWallet("");
    } catch (err: any) {
      if (err?.message?.includes("rejected") || err?.code === 4001) {
        toast({ title: "Transaction rejected in MetaMask", variant: "destructive" });
      } else {
        toast({ title: "Failed", description: err?.message || "Unknown error", variant: "destructive" });
      }
    } finally {
      setRoleLoading(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">

      {/* System Pause */}
      <Card className={isPaused ? "border-red-300" : "border-green-300"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isPaused
              ? <PauseCircle className="h-5 w-5 text-red-600" />
              : <PlayCircle className="h-5 w-5 text-green-600" />}
            System Operational Status
          </CardTitle>
          <CardDescription>
            Pause or resume certificate issuance and revocation on the
            CertificateRegistry smart contract. Only SUPERADMIN_ROLE can perform
            this action. Each toggle requires a MetaMask transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg p-3 text-sm font-semibold ${
            isPaused === null
              ? "bg-muted text-muted-foreground"
              : isPaused
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {isPaused === null
              ? "Checking contract status..."
              : isPaused
                ? "PAUSED - Issuance and revocation are currently blocked on-chain"
                : "OPERATIONAL - Issuance and revocation are enabled"}
          </div>
          <Button
            variant={isPaused ? "default" : "destructive"}
            onClick={handlePauseToggle}
            disabled={pauseLoading || isPaused === null || !contractAddress}
            className="w-full gap-2"
          >
            {pauseLoading
              ? "Waiting for MetaMask..."
              : isPaused
                ? <><PlayCircle className="h-4 w-4" /> Unpause System</>
                : <><PauseCircle className="h-4 w-4" /> Pause System</>}
          </Button>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-primary" />
            Registry Admin Role Management
          </CardTitle>
          <CardDescription>
            Grant or revoke CERTIFICATE_ROLE on the CertificateRegistry contract.
            Only SUPERADMIN_ROLE can manage roles. Each action requires a
            MetaMask transaction and costs a small amount of Sepolia gas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grant */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Grant CERTIFICATE_ROLE</p>
            <div className="flex gap-2">
              <Input
                placeholder="0x... wallet address"
                value={newAdminWallet}
                onChange={(e) => setNewAdminWallet(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={handleGrantRole}
                disabled={roleLoading || !newAdminWallet.trim() || !contractAddress}
                className="gap-1 whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                Grant
              </Button>
            </div>
          </div>

          {/* Revoke */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Revoke CERTIFICATE_ROLE</p>
            <div className="flex gap-2">
              <Input
                placeholder="0x... wallet address"
                value={revokeAdminWallet}
                onChange={(e) => setRevokeAdminWallet(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRevokeRole}
                disabled={roleLoading || !revokeAdminWallet.trim() || !contractAddress}
                className="gap-1 whitespace-nowrap"
              >
                <UserMinus className="h-4 w-4" />
                Revoke
              </Button>
            </div>
          </div>

          {!contractAddress && (
            <p className="text-xs text-muted-foreground">
              Contract address not configured. Role management requires
              CERTIFICATE_REGISTRY_ADDRESS to be set in Vercel environment variables.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<"Operational" | "Paused" | "Degraded">("Operational");
  // Read session values into state on mount so they are never read
  // directly inside JSX, which would cause a hydration mismatch between
  // server-rendered HTML (where sessionStorage doesn't exist) and the
  // client-rendered version.
  const [sessionRole, setSessionRole] = useState<string>("");
  const [sessionWallet, setSessionWallet] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const role = sessionStorage.getItem("naub_role") || "";
    const wallet = sessionStorage.getItem("naub_wallet") || "";
    setSessionRole(role);
    setSessionWallet(wallet);
    loadData(role, wallet);
    checkPauseStatus();

    // Poll the on-chain pause state every 30 seconds so the System Status
    // tile stays live even if paused/unpaused from a different session.
    const interval = setInterval(checkPauseStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Checks the CertificateRegistry contract's live paused() state so the
   * System Status tile reflects reality - not just whether the analytics
   * API responded. This is a free view call, no gas or wallet needed.
   * Polled again every 30 seconds so the tile updates live if a Super
   * Admin pauses/unpauses the system from another session or tab.
   */
  const checkPauseStatus = async () => {
    try {
      const contractAddress = await getRegistryContractAddress();
      if (!contractAddress) return;
      const paused = await isContractPaused(contractAddress);
      setSystemStatus((prev) => (prev === "Degraded" ? prev : paused ? "Paused" : "Operational"));
    } catch (error) {
      console.error("[Dashboard] Failed to check pause status:", error);
      // Leave systemStatus as-is - don't downgrade to Degraded just
      // because the pause check itself failed (e.g. no wallet connected).
    }
  };

  const loadData = async (role: string, wallet: string) => {
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (wallet) params.set("wallet", wallet);

      const analyticsResponse = await fetch(`/api/admin/analytics?${params.toString()}`);

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
        setCertificates(analyticsData.recentCertificates || []);
      }

      if (!analyticsResponse.ok) {
        setSystemStatus("Degraded");
      }
      // If analytics succeeded, leave systemStatus for checkPauseStatus()
      // to set based on the real on-chain state, rather than overwriting
      // it back to "Operational" here.
    } catch (error) {
      console.error("[Dashboard] Error loading data:", error);
      setSystemStatus("Degraded");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("naub_jwt");
    sessionStorage.removeItem("naub_role");
    sessionStorage.removeItem("naub_wallet");
    router.push("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-36 mb-3" />
                  <Skeleton className="h-6 w-20" />
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <NaubBrand subtitle="Registry Admin Dashboard" />
            </Link>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 bg-transparent"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                Total Certificates
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics?.totalCertificates || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600 transition-transform duration-300 group-hover:scale-110" />
                Valid
              </CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {analytics?.validCertificates || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 transition-transform duration-300 group-hover:scale-110" />
                Revoked
              </CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {analytics?.revokedCertificates || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                Total Verifications
              </CardTitle>
              <div className="text-2xl font-bold">
                {analytics?.totalVerifications || 0}
              </div>
            </CardHeader>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                Active Certificate Holders
              </CardTitle>
              <div className="text-2xl font-bold">
                {analytics?.activeCertificateHolders ?? 0}
              </div>
            </CardHeader>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                System Status
              </CardTitle>
              <div className={`text-2xl font-bold ${
                systemStatus === "Operational" ? "text-green-600" :
                systemStatus === "Paused" ? "text-red-600" :
                "text-orange-500"
              }`}>
                {systemStatus}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Certificates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Recent Certificates</CardTitle>
                <CardDescription>5 most recently issued certificates</CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/dashboard/issue">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Issue Certificate
                  </Button>
                </Link>
                <Link href="/admin/dashboard/certificates">
                  <Button variant="outline" className="gap-2">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Certificate ID</th>
                      <th className="text-left p-4 font-medium">Student / Graduate Name</th>
                      <th className="text-left p-4 font-medium">Programme of Study</th>
                      <th className="text-left p-4 font-medium">Issue Date</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      {sessionRole === "superadmin" && (
                        <th className="text-left p-4 font-medium">Issued By</th>
                      )}
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates
                      .slice()
                      .sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime())
                      .slice(0, 5)
                      .map((cert) => (
                        <tr key={cert.id} className="border-t transition-colors duration-200 hover:bg-primary/5 hover:border-l-2 hover:border-l-primary">
                          <td className="p-4 font-mono text-sm">{cert.id}</td>
                          <td className="p-4">{cert.studentName}</td>
                          <td className="p-4 text-sm text-muted-foreground">{cert.programmeOfStudy}</td>
                          <td className="p-4 text-sm">{formatDate(cert.dateIssued)}</td>
                          <td className="p-4">
                            <Badge className={getCertificateStatusColor(cert.status)}>
                              {cert.status}
                            </Badge>
                          </td>
                          {sessionRole === "superadmin" && (
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

            {certificates.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <FileCheck className="h-8 w-8 text-primary/60" />
                </div>
                <p className="font-medium text-foreground">No certificates issued yet</p>
                <p className="mt-1 text-sm">Certificates you issue will appear here once created.</p>
                <Link href="/admin/dashboard/issue">
                  <Button size="sm" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Issue your first certificate
                  </Button>
                </Link>
              </div>
            )}

            {(analytics?.totalCertificates ?? 0) > 5 && (
              <div className="mt-4 text-center">
                <Link href="/admin/dashboard/certificates">
                  <Button variant="outline" className="gap-2">
                    View all {analytics?.totalCertificates} certificates
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registry Admin Activity - SuperAdmin only */}
        {analytics?.registryAdminActivity && Object.keys(analytics.registryAdminActivity).length > 0 && (
          <Card className="border-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Registry Admin Activity
              </CardTitle>
              <CardDescription>
                Per-admin certificate issuance breakdown. Each row represents a wallet
                that has issued at least one certificate through this system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {Object.entries(analytics.registryAdminActivity).map(([wallet, data]) => (
                  <div key={wallet} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground break-all">{wallet}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last active: {data.lastActive}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-2xl font-black text-primary">{data.issued}</p>
                      <p className="text-xs text-muted-foreground">certificates</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Management + System Pause - SuperAdmin only */}
        <AdminControlPanel />

      </div>
    </div>
  );
}
