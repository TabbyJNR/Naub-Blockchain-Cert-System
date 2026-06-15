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
  "First Class Honours",
  "Second Class Honours (Upper Division)",
  "Second Class Honours (Lower Division)",
  "Third Class Honours",
  "Pass",
];

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
