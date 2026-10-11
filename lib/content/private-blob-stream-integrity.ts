import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Validate the bytes actually stored by the private provider, not merely
 * client-supplied hashes/headers or a successful HEAD request.
 * Stream to avoid loading a potentially large educational video in memory.
 * This is not a malware scanner, PDF parser or full video codec validator.
 */
const FILE_SIGNATURE_BYTES = 16;

function matchesSignature(prefix: Uint8Array, mimeType: string): boolean {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...prefix.subarray(offset, offset + length));
  switch (mimeType) {
    case "application/pdf":
      return prefix.length >= 5 && ascii(0, 5) === "%PDF-";
    case "image/jpeg":
      return prefix.length >= 3 && prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
    case "image/png":
      return prefix.length >= 8 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => prefix[i] === byte);
    case "image/webp":
      return prefix.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
    case "video/mp4":
      return prefix.length >= 12 && ascii(4, 4) === "ftyp";
    default:
      return false;
  }
}

export async function verifyEducationalAssetBody(input: {
  stream: ReadableStream<Uint8Array>;
  expectedByteSize: number;
  expectedSha256Hex: string;
  expectedContentType: string;
}) {
  if (!Number.isSafeInteger(input.expectedByteSize) || input.expectedByteSize <= 0 ||
      !/^[a-f0-9]{64}$/.test(input.expectedSha256Hex)) {
    throw new Error("Educational asset integrity metadata is invalid");
  }

  const hash = createHash("sha256");
  const firstBytes = new Uint8Array(FILE_SIGNATURE_BYTES);
  let copied = 0;
  let total = 0;
  const reader = input.stream.getReader();
  let completed = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        completed = true;
        break;
      }
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (!Number.isSafeInteger(total) || total > input.expectedByteSize) {
        throw new Error("Educational asset exceeds the declared byte size");
      }
      if (copied < firstBytes.length) {
        const next = Math.min(firstBytes.length - copied, value.byteLength);
        firstBytes.set(value.subarray(0, next), copied);
        copied += next;
      }
      hash.update(value);
    }
  } finally {
    if (!completed) {
      try { await reader.cancel(); } catch { /* Provider may already have closed. */ }
    }
    reader.releaseLock();
  }

  if (total !== input.expectedByteSize) {
    throw new Error("Educational asset byte size differs from the verified object");
  }

  if (!matchesSignature(firstBytes.subarray(0, copied), input.expectedContentType)) {
    throw new Error("Educational asset signature does not match the declared content type");
  }

  const digest = hash.digest("hex");
  if (!timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(input.expectedSha256Hex, "hex"))) {
    throw new Error("Educational asset SHA-256 digest does not match stored bytes");
  }

  return { byteSize: total, sha256Hex: digest };
}
