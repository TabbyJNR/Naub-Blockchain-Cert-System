"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { NaubBrand } from "@/components/naub-brand";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleConnectAndSignIn = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask to access the NAUB Registry Portal.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: connect wallet
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setWalletAddress(address);

      // Step 2: request a nonce for this wallet
      const nonceRes = await fetch("/api/admin/login?step=nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error || "Failed to obtain nonce");

      // Step 3: sign the nonce with EIP-191 personal_sign
      const signature: string = await window.ethereum.request({
        method: "personal_sign",
        params: [nonceData.nonce, address],
      });

      // Step 4: submit signature to verify and receive a JWT
      const loginRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce: nonceData.nonce,
        }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok) {
        sessionStorage.setItem("naub_jwt", loginData.token);
        sessionStorage.setItem("naub_role", loginData.role);
        sessionStorage.setItem("naub_wallet", loginData.walletAddress);
        toast({
          title: "Signed in",
          description: `Connected as ${loginData.role} (${address.slice(0, 6)}...${address.slice(-4)})`,
        });
        router.push("/admin/dashboard");
      } else {
        toast({
          title: "Sign-in failed",
          description: loginData.error || "Wallet is not authorised on the CertificateRegistry contract",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "An error occurred during wallet sign-in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      {/* Back Button */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <NaubBrand title="NAUB Registry Portal" subtitle="Super Admin / Registry Admin access" />
          </div>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Wallet-Based Access</CardTitle>
            <CardDescription>
              Sign in with your registered Ethereum wallet to issue, revoke, and monitor NAUB blockchain degree certificates
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleConnectAndSignIn} className="w-full gap-2" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {isLoading ? "Connecting..." : "Connect Wallet & Sign In"}
          </Button>

          {walletAddress && (
            <p className="break-all rounded bg-muted p-3 text-center font-mono text-xs text-muted-foreground">
              {walletAddress}
            </p>
          )}

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p>
              Sign-in uses an EIP-191 message signature — no password is stored. Your wallet must hold the{" "}
              <strong>SUPERADMIN_ROLE</strong> or <strong>CERTIFICATE_ROLE</strong> on the CertificateRegistry smart
              contract.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
