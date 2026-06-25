export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000);
  return `NAUB-${year}-${timestamp}${random}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a date the way it appears on the official NAUB certificate:
 * an ordinal day, full month name, full year - e.g. "15th December, 2025".
 */
export function formatOrdinalDate(date: string): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-NG", { month: "long" });
  const year = d.getFullYear();

  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${month}, ${year}`;
}

export function getCertificateStatusColor(status: string): string {
  switch (status) {
    case "valid":
      return "text-primary bg-accent";
    case "revoked":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

// Degree programmes offered at NAUB
export const certificateCategories = [
  "B.Sc. Computer Science",
  "B.Sc. Cyber Security",
  "B.Sc. Software Engineering",
  "B.Sc. Information Systems",
  "B.Sc. Accounting",
  "B.Sc. Economics",
  "B.Sc. Political Science",
  "B.Sc. Criminology and Security Studies",
  "B.Sc. Peace Studies and Conflict Resolution",
  "B.A. Military History",
];

export const degreeClasses = [
  "First Class",
  "Second Class Upper Division",
  "Second Class Lower Division",
  "Third Class",
  "Pass",
];

/**
 * The Vice Chancellor's name is a fixed institutional letterhead detail,
 * not something entered per-certificate. It is defined ONCE here and
 * imported everywhere it's needed - the issue form's hash computation,
 * the issue API route, and the certificate display component - so the
 * value used to compute the on-chain certificate hash can never silently
 * drift from the value shown on the printed certificate. A mismatch
 * between these would be a serious bug: the certificate hash anchored
 * on Sepolia would no longer match what re-hashing the displayed
 * certificate produces.
 */
export const NAUB_VICE_CHANCELLOR_NAME = "Professor Lawan Bala Buratai";

/**
 * Canonical certificate payload for SHA-256 hashing.
 * All eight required fields are concatenated in a fixed order.
 * The browser uses this same order via the Web Crypto API (SubtleCrypto).
 */
export function canonicalCertificatePayload(fields: {
  studentName: string;
  matriculationNumber: string;
  dateOfBirth: string;
  programmeOfStudy: string;
  classOfDegree: string;
  dateOfAward: string;
  certificateNumber: string;
  viceChancellor: string;
}) {
  return [
    fields.studentName.trim().toUpperCase(),
    fields.matriculationNumber.trim().toUpperCase(),
    fields.dateOfBirth,
    fields.programmeOfStudy.trim().toUpperCase(),
    fields.classOfDegree.trim().toUpperCase(),
    fields.dateOfAward,
    fields.certificateNumber.trim().toUpperCase(),
    fields.viceChancellor.trim().toUpperCase(),
  ].join("|");
}

/**
 * Canonical holder identity payload for SHA-256 hashing.
 * Used to produce the anonymised holderIdentityHash stored on-chain
 * in compliance with NDPR data minimisation requirements.
 */
export function canonicalHolderPayload(fullName: string, dateOfBirth: string) {
  return `${fullName.trim().toUpperCase()}|${dateOfBirth}`;
}
