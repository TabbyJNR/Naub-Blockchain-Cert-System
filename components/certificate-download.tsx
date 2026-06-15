"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Certificate } from "@/lib/database";

interface CertificateDownloadProps {
  certificate: Certificate;
  qrCodeDataUrl?: string;
}

export function CertificateDownload({
  certificate,
  qrCodeDataUrl,
}: CertificateDownloadProps) {
  const handleDownload = () => {
    // Create a printable certificate HTML
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>NAUB Certificate - ${certificate.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              background: white;
            }
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              border: 8px solid #6f2f1b;
              padding: 40px;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #6f2f1b;
              padding-bottom: 20px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #6f2f1b;
              margin-bottom: 10px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #333;
              margin: 20px 0;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
            }
            .content {
              margin: 30px 0;
            }
            .field {
              margin: 15px 0;
              display: flex;
              border-bottom: 1px solid #eee;
              padding: 10px 0;
            }
            .field-label {
              font-weight: bold;
              color: #6f2f1b;
              width: 200px;
            }
            .field-value {
              color: #333;
              flex: 1;
            }
            .qr-section {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #6f2f1b;
            }
            .qr-code {
              margin: 20px auto;
              padding: 10px;
              background: white;
              border: 2px solid #6f2f1b;
              display: inline-block;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              background: #6f2f1b;
              color: white;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              .certificate { border: 8px solid #6f2f1b; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="logo">NAUB</div>
              <div class="subtitle">Nigerian Army University Biu</div>
              <div class="title">Academic Certificate</div>
            </div>
            
            <div class="content">
              <div class="field">
                <div class="field-label">Certificate ID:</div>
                <div class="field-value">${certificate.id}</div>
              </div>
              <div class="field">
                <div class="field-label">Student / Graduate Name:</div>
                <div class="field-value">${certificate.studentName}</div>
              </div>
              <div class="field">
                <div class="field-label">Programme of Study:</div>
                <div class="field-value">${certificate.programmeOfStudy}</div>
              </div>
              <div class="field">
                <div class="field-label">Matriculation No.:</div>
                <div class="field-value">${certificate.matriculationNumber || "Not recorded"}</div>
              </div>
              <div class="field">
                <div class="field-label">Class of Degree:</div>
                <div class="field-value">${certificate.classOfDegree || "Not recorded"}</div>
              </div>
              <div class="field">
                <div class="field-label">Certificate No.:</div>
                <div class="field-value">${certificate.certificateNumber || certificate.id}</div>
              </div>
              <div class="field">
                <div class="field-label">Date of Birth:</div>
                <div class="field-value">${certificate.dateOfBirth}</div>
              </div>
              <div class="field">
                <div class="field-label">Vice Chancellor:</div>
                <div class="field-value">${certificate.viceChancellor}</div>
              </div>
              <div class="field">
                <div class="field-label">Date Issued:</div>
                <div class="field-value">${new Date(
                  certificate.dateIssued
                ).toLocaleDateString()}</div>
              </div>
              <div class="field">
                <div class="field-label">Date of Award:</div>
                <div class="field-value">${new Date(
                  certificate.dateOfAward || certificate.dateIssued
                ).toLocaleDateString()}</div>
              </div>
              <div class="field">
                <div class="field-label">Status:</div>
                <div class="field-value"><span class="status-badge">${certificate.status.toUpperCase()}</span></div>
              </div>
              <div class="field">
                <div class="field-label">Blockchain Hash:</div>
                <div class="field-value" style="font-family: monospace; font-size: 11px; word-break: break-all;">${
                  certificate.blockchainHash
                }</div>
              </div>
            </div>

            ${
              qrCodeDataUrl
                ? `
            <div class="qr-section">
              <h3 style="color: #6f2f1b; margin-bottom: 10px;">Verification QR Code</h3>
              <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                Scan this code to verify the certificate on the blockchain
              </p>
              <div class="qr-code">
                <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 150px; height: 150px;" />
              </div>
            </div>
            `
                : ""
            }

            <div class="footer">
              <p><strong>This is an official degree certificate record issued by Nigerian Army University Biu</strong></p>
              <p>Verified on blockchain - Transaction: ${
                certificate.transactionHash
              }</p>
              <p>Block Number: ${certificate.blockNumber}</p>
              <p style="margin-top: 10px;">For verification, visit: ${
                typeof window !== "undefined" ? window.location.origin : ""
              }/verify</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a blob and download
    const blob = new Blob([certificateHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NAUB-Certificate-${certificate.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also trigger print dialog
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(certificateHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <Button onClick={handleDownload} className="gap-2">
      <Download className="h-4 w-4" />
      Download Certificate
    </Button>
  );
}
