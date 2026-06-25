/**
 * IPFS storage via Pinata.
 *
 * Certificates are uploaded as real PDF files and pinned to IPFS through
 * Pinata's pinning service, giving every issued certificate a genuine,
 * permanent, content-addressed document - replacing the placeholder
 * `ipfs://demo-<id>` CIDs used before this was implemented.
 *
 * If PINATA_JWT is not configured, uploads are skipped and the system
 * falls back to a placeholder CID so issuance is never blocked by a
 * missing or misconfigured IPFS integration - this mirrors the same
 * "fail open, log clearly" pattern used elsewhere (rate limiting,
 * nonce storage) for non-critical-path dependencies.
 */

const PINATA_JWT = process.env.PINATA_JWT || "";
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export interface IpfsUploadResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Uploads a PDF (or any file) buffer to IPFS via Pinata and returns the
 * resulting CID. Returns null if Pinata is not configured or the upload
 * fails - callers should fall back to a placeholder CID in that case
 * rather than blocking certificate issuance entirely.
 */
export async function uploadToIpfs(
  fileBuffer: Uint8Array,
  filename: string,
  mimeType = "application/pdf",
): Promise<IpfsUploadResult | null> {
  if (!PINATA_JWT) {
    console.warn("[IPFS] PINATA_JWT is not set - skipping upload, using placeholder CID");
    return null;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append(
      "pinataMetadata",
      JSON.stringify({ name: filename }),
    );
    formData.append(
      "pinataOptions",
      JSON.stringify({ cidVersion: 1 }),
    );

    const response = await fetch(PINATA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[IPFS] Pinata upload failed (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    const cid: string = data.IpfsHash;

    if (!cid) {
      console.error("[IPFS] Pinata response missing IpfsHash:", data);
      return null;
    }

    return {
      cid,
      gatewayUrl: `${PINATA_GATEWAY}/${cid}`,
    };
  } catch (error) {
    console.error("[IPFS] Upload error:", error);
    return null;
  }
}

/** Builds a public gateway URL for a given CID (handles both raw CIDs and ipfs:// URIs). */
export function ipfsGatewayUrl(cidOrUri: string): string {
  const cid = cidOrUri.startsWith("ipfs://") ? cidOrUri.slice(7) : cidOrUri;
  return `${PINATA_GATEWAY}/${cid}`;
}
