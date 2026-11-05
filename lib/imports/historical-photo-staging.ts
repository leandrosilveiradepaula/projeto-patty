import { createHash } from "node:crypto";
import { detectPrivateFileMimeType } from "../validation/private-files.ts";

const SHA = /^[a-f0-9]{64}$/;
const SOURCE = /^source_[0-9]{4}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 10 * 1024 * 1024;

export type ReviewedHistoricalPhoto = Readonly<{
  batch_id: string;
  source_id: string;
  client_id: string;
  source_sha256: string;
  client_file_id: string;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png";
  photo_type: "jpeg" | "png";
  byte_size: number;
}>;

/** No names, filenames, contact details or image pixels in audit metadata. */
export function prepareReviewedHistoricalPhoto(input: Readonly<{
  batchId: string;
  sourceId: string;
  clientId: string;
  sourceSha256: string;
  bytes: Uint8Array;
}>): ReviewedHistoricalPhoto {
  const bad = (): never => { throw new Error("historical_photo_source_blocked"); };
  if (!UUID.test(input.batchId) || !UUID.test(input.clientId)
    || !SOURCE.test(input.sourceId) || !SHA.test(input.sourceSha256)
    || !(input.bytes instanceof Uint8Array)
    || input.bytes.byteLength < 1 || input.bytes.byteLength > MAX_BYTES) bad();
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  if (hash !== input.sourceSha256) bad();
  const mimeType = detectPrivateFileMimeType(input.bytes);
  if (mimeType !== "image/jpeg" && mimeType !== "image/png") bad();
  // Namespaces are opaque and repeatable. No client PII or original filename.
  const opaque = createHash("sha256").update(
    "historical-photo-import-v1:" + input.batchId + ":" + input.sourceId +
    ":" + input.clientId + ":" + hash,
  ).digest("hex");
  const fileId = [
    opaque.slice(0, 8), opaque.slice(8, 12), "4" + opaque.slice(13, 16),
    ((parseInt(opaque[16]!, 16) & 3) | 8).toString(16) + opaque.slice(17, 20),
    opaque.slice(20, 32),
  ].join("-");
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  return {
    batch_id: input.batchId, source_id: input.sourceId,
    client_id: input.clientId, source_sha256: hash,
    client_file_id: fileId,
    storage_path: `clients/${input.clientId}/photo/${fileId}.${ext}`,
    mime_type: mimeType as "image/jpeg" | "image/png",
    photo_type: ext === "jpg" ? "jpeg" : "png",
    byte_size: input.bytes.byteLength,
  };
}
