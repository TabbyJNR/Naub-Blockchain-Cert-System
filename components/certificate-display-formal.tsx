"use client";

import { useRef } from "react";
import type { Certificate } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatOrdinalDate, NAUB_VICE_CHANCELLOR_NAME } from "@/lib/certificate-utils";

interface CertificateDisplayProps {
  certificate: Certificate;
}

/**
 * Renders the issued certificate in the same visual format as the
 * official NAUB "Statement of Result" document.
 *
 * FIXED LETTERHEAD (never changes per certificate — edit the constants
 * below if the institution's signatories change):
 *   - University name, address, seal/crest
 *   - Vice Chancellor's name and credentials (header, left)
 *   - Registrar's name, credentials, and email (header, right)
 *   - Academic Secretary's name and signature block (footer)
 *   - Official stamp
 *
 * LIVE PER CERTIFICATE (pulled from the issued certificate record):
 *   - Ref. No (= certificate.certificateNumber)
 *   - Student name
 *   - Programme of study (degree name)
 *   - Class of degree
 *   - Date of award
 *
 * Every other field captured at issuance (matriculation number, date of
 * birth, the viceChancellor field itself, holder identity hash, etc.)
 * remains fully stored in the database and anchored in the on-chain
 * hash — it is simply not printed on the visible document, matching
 * the real paper certificate.
 *
 * The seal and stamp are placeholders until the real NAUB crest image
 * is supplied — search for "TODO: replace with real crest image" below.
 */

// ---------------------------------------------------------------------------
// Fixed letterhead constants — edit here if the institution's signatories
// or printed details change. These are intentionally NOT pulled from the
// certificate record. (NAUB_VICE_CHANCELLOR_NAME is imported from
// certificate-utils since it also drives the on-chain hash computation —
// it must stay identical in both places.)
// ---------------------------------------------------------------------------
const NAUB_VICE_CHANCELLOR_CREDENTIALS = "BSc, Msc (UNIMAID), Ph.D (ABU), mNSBMB, mNBS, GCNNS, FCAL";

const NAUB_REGISTRAR_NAME = "Lt Col OS Job";
const NAUB_REGISTRAR_CREDENTIALS = "FSS, plsc, flss, mnarc, MTRCN, Bsc, PGDE, MIAD, MA, MLSS";
const NAUB_REGISTRAR_EMAIL = "registrar@naub.edu.ng";

const NAUB_ACADEMIC_SECRETARY_NAME = "Mohammed Musa Bombo";

export function CertificateDisplayFormal({ certificate }: CertificateDisplayProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  /**
   * Printing uses the standard "print only this element" CSS technique:
   * everything on the page is hidden except the certificate, which is
   * repositioned to fill the printable A4 page (see the @media print
   * rules in CERTIFICATE_DISPLAY_STYLES below). This prints the
   * certificate exactly as it already renders on screen — same fonts,
   * same already-loaded images, no separate window or re-injected HTML
   * that can fall out of sync with the live layout.
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-muted/30 p-4 sm:p-8">
        <div ref={certificateRef} className="naub-certificate naub-print-area">
          <div className="naub-watermark" aria-hidden="true" />

          {/* ===== FIXED LETTERHEAD — header ===== */}
          <header className="naub-header">
            <h1>NIGERIAN ARMY UNIVERSITY BIU</h1>
            <p className="naub-address">P.M.B. 1500 BIU, BORNO STATE, NIGERIA</p>
          </header>

          <div className="naub-header-row">
            <div className="naub-header-col naub-header-col--left">
              <p className="naub-role-label">Vice Chancellor</p>
              <p className="naub-role-name">{NAUB_VICE_CHANCELLOR_NAME}</p>
              <p className="naub-role-credentials">{NAUB_VICE_CHANCELLOR_CREDENTIALS}</p>
            </div>

            {/* Real NAUB crest image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/naub-seal.png"
              alt="Nigerian Army University Biu official seal"
              className="naub-seal-img"
            />

            <div className="naub-header-col naub-header-col--right">
              <p className="naub-role-label">Ag Registrar</p>
              <p className="naub-role-name">{NAUB_REGISTRAR_NAME}</p>
              <p className="naub-role-credentials">{NAUB_REGISTRAR_CREDENTIALS}</p>
              <p className="naub-role-email">{NAUB_REGISTRAR_EMAIL}</p>
            </div>
          </div>

          {/* ===== LIVE — Ref. No (= certificateNumber) ===== */}
          <p className="naub-ref">Ref. No: {certificate.certificateNumber}</p>

          {/* ===== FIXED LETTERHEAD — title ===== */}
          <div className="naub-title-block">
            <h2>STATEMENT OF RESULT</h2>
            <div className="naub-flourish" aria-hidden="true">
              <span />
              <svg viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
              <span />
            </div>
          </div>

          {/* ===== LIVE — student result fields ===== */}
          <div className="naub-body">
            <p className="naub-intro">This is to certify that</p>

            <p className="naub-fill naub-student-name">{certificate.studentName}</p>

            <p className="naub-paragraph">
              having completed an approved course of study and passed the prescribed
              examinations, has under the authority of the Senate been awarded
            </p>

            <p className="naub-fill naub-programme">{certificate.programmeOfStudy}</p>

            <p className="naub-with-row">
              <span>with</span>
              <span className="naub-fill naub-class">{certificate.classOfDegree}</span>
            </p>

            <p className="naub-with-row">
              <span>Date of Award:</span>
              <span className="naub-fill naub-date">{formatOrdinalDate(certificate.dateOfAward)}</span>
            </p>
          </div>

          {/* ===== FIXED LETTERHEAD — footer signature and stamp ===== */}
          <footer className="naub-footer">
            <div className="naub-signature">
            {/* Script-font signature rendering of the Academic Secretary's name */}
              <div className="naub-signature-script">{NAUB_ACADEMIC_SECRETARY_NAME}</div>
              <p className="naub-signature-name">{NAUB_ACADEMIC_SECRETARY_NAME}</p>
              <p className="naub-signature-title">Academic Secretary</p>
              <p className="naub-signature-subtitle">for Registrar</p>
            </div>

            {/* Real NAUB crest used as the official stamp — rotated like an ink stamp */}
            <div className="naub-stamp">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/naub-seal.png"
                alt="Nigerian Army University Biu official stamp"
                className="naub-stamp-img"
              />
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{CERTIFICATE_DISPLAY_STYLES}</style>
    </div>
  );
}

const CERTIFICATE_DISPLAY_STYLES = `
.naub-certificate {
  position: relative;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 56px 40px;
  background: #fffdfa;
  border: 3px double #7a1f1f;
  font-family: Georgia, 'Times New Roman', serif;
  color: #1a1a1a;
  overflow: hidden;
  box-sizing: border-box;
}

.naub-watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.06;
  background-image: radial-gradient(circle, #7a1f1f 0 2px, transparent 3px);
  background-size: 28px 28px;
}

.naub-header { text-align: center; margin-bottom: 6px; }
.naub-header h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 1px;
  font-weight: 700;
}
.naub-address { margin: 2px 0 0; font-size: 11.5px; color: #4a4a4a; }

.naub-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 18px 0 4px;
  gap: 14px;
}
.naub-header-col { flex: 1; font-size: 10.5px; line-height: 1.4; }
.naub-header-col--right { text-align: right; }
.naub-role-label { margin: 0; color: #555; }
.naub-role-name { margin: 2px 0 0; font-weight: 700; font-size: 11.5px; }
.naub-role-credentials { margin: 1px 0 0; color: #555; font-size: 9.5px; }
.naub-role-email { margin: 1px 0 0; color: #555; font-size: 9.5px; }

.naub-seal-img { width: 88px; height: 88px; object-fit: contain; }

.naub-ref { margin: 8px 0 0; font-size: 11.5px; }

.naub-title-block { text-align: center; margin: 26px 0 28px; }
.naub-title-block h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #7a1f1f;
  letter-spacing: 1px;
}
.naub-flourish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #7a1f1f;
  margin-top: 6px;
}
.naub-flourish span { display: inline-block; width: 60px; height: 1px; background: #7a1f1f; }

.naub-body { text-align: center; }
.naub-intro { font-style: italic; margin: 0 0 18px; font-size: 14px; }

.naub-fill {
  display: inline-block;
  margin: 0 0 20px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
  font-weight: 700;
}
.naub-student-name { font-size: 19px; min-width: 320px; }
.naub-programme { font-size: 17px; min-width: 320px; margin-top: 4px; }

.naub-paragraph { font-size: 13.5px; line-height: 1.6; margin: 0 0 18px; padding: 0 12px; }

.naub-with-row {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 10px;
  font-size: 13.5px;
  margin-bottom: 16px;
}
.naub-with-row .naub-fill { margin-bottom: 0; font-size: 15px; min-width: 220px; }

.naub-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 40px;
}

.naub-signature { text-align: center; min-width: 220px; }
.naub-signature-script {
  font-family: 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive;
  font-size: 28px;
  color: #1a1a1a;
  line-height: 1.1;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
  min-width: 200px;
  display: inline-block;
}
.naub-signature-name { margin: 6px 0 0; font-weight: 700; font-size: 13px; }
.naub-signature-title { margin: 2px 0 0; font-size: 11.5px; color: #555; }
.naub-signature-subtitle { margin: 0; font-size: 11.5px; color: #555; }

.naub-stamp { flex: 0 0 auto; }
.naub-stamp-img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  transform: rotate(-8deg);
  opacity: 0.85;
}

@media (max-width: 640px) {
  .naub-certificate { padding: 28px 20px; }
  .naub-student-name, .naub-programme { min-width: 0; font-size: 15px; }
}

/*
 * Print-only-this-element technique: hide everything on the page except
 * the certificate itself, then reposition it to fill the printable A4
 * page. This prints the certificate exactly as it already renders on
 * screen, with no separate window, no re-injected HTML, and no relative
 * image path issues.
 */
@media print {
  @page { size: A4 portrait; margin: 10mm; }

  body * { visibility: hidden; }

  .naub-print-area, .naub-print-area * { visibility: visible; }

  .naub-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    border-width: 2px !important;
    box-shadow: none !important;
  }
}
`;
