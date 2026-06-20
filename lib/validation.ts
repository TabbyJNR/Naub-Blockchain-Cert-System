/**
 * Shared input validation helpers for API routes.
 *
 * These exist because user-submitted data here doesn't just get stored
 * in a database — fields like the eight certificate fields get hashed
 * client-side and that hash is permanently anchored on the Ethereum
 * Sepolia blockchain. There is no "undo" for bad data once it's
 * on-chain, so every field accepted by an API route that can lead to
 * an issuance, revocation, or stored record is validated for type,
 * presence, and a sane length before use.
 */

const MAX_SHORT_FIELD_LENGTH = 200;
const MAX_LONG_FIELD_LENGTH = 1000;

/** True if value is a non-empty, reasonably-sized string after trimming. */
export function isNonEmptyString(value: unknown, maxLength = MAX_SHORT_FIELD_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

/** True if value is a string up to maxLength, allowing empty (for optional fields). */
export function isValidOptionalString(value: unknown, maxLength = MAX_LONG_FIELD_LENGTH): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.length <= maxLength);
}

/** True if value parses to a real calendar date and isn't wildly out of range. */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 1900 && year <= 2200;
}

/** True if value is a 0x-prefixed 64-character hex string (SHA-256 hash / bytes32). */
export function isValidHexHash(value: unknown): value is string {
  return typeof value === "string" && /^(0x)?[a-f0-9]{64}$/i.test(value.trim());
}

/** True if value is a valid Ethereum address (0x + 40 hex chars). */
export function isValidWalletAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-f0-9]{40}$/i.test(value.trim());
}

/** True if value is a plausible Ethereum tx hash (0x + 64 hex chars). */
export function isValidTxHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-f0-9]{64}$/i.test(value.trim());
}

/**
 * True if value is a non-negative integer (e.g. a block number).
 * Accepts either a clean JS number or a numeric string, since values
 * that cross a browser -> JSON -> server boundary can sometimes arrive
 * as one or the other depending on the provider/runtime — this field is
 * on the critical path for recording a confirmed blockchain transaction,
 * so it is deliberately tolerant of both forms rather than rejecting a
 * genuinely valid block number over a representation difference.
 */
export function isValidBlockNumber(value: unknown): value is number {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0;
  }
  return false;
}

/** True if value, once trimmed, is a non-empty string of reasonable length for a long-form reason/note. */
export function isValidReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_LONG_FIELD_LENGTH;
}

/**
 * Strips a string down to a safe length and removes characters that have
 * no legitimate place in a name/identifier field (control characters).
 * Does not attempt to block HTML/script content specifically — the
 * frontend uses React, which escapes rendered text by default, so this
 * is about data hygiene and length limits, not XSS-specific filtering.
 */
export function sanitizeString(value: string, maxLength = MAX_SHORT_FIELD_LENGTH): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLength);
}

export interface FieldSpec {
  name: string;
  validator: (value: unknown) => boolean;
}

/**
 * Validates a body object against a list of field specs, returning the
 * first failure as a human-readable message, or null if all fields pass.
 */
export function validateFields(body: Record<string, unknown>, specs: FieldSpec[]): string | null {
  for (const spec of specs) {
    if (!spec.validator(body[spec.name])) {
      return `Invalid or missing field: ${spec.name}`;
    }
  }
  return null;
}
