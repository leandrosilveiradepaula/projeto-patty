import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";
import { stageHistoricalPhotoSource } from "@/lib/imports/historical-photo-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_PHOTO_BYTES + 64 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const SOURCE = /^source_[0-9]{4}$/;
const allowedKeys = ["photo", "batch_id", "source_id", "sha256",
  "confirmed_identity", "confirmed_photo", "confirmed_custody"];

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
  });
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return !!origin && origin === new URL(request.url).origin
    && (!fetchSite || fetchSite === "same-origin");
}
/** Enforce the streamed byte limit even without trustworthy Content-Length. */
async function boundedForm(request: NextRequest): Promise<FormData | null> {
  const type = request.headers.get("content-type");
  if (!type || !/^multipart\/form-data;\s*boundary=/i.test(type)) return null;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Request(request.url, {
      method: "POST", headers: { "content-type": type },
      body: bytes.buffer as ArrayBuffer,
    }).formData();
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  await requireRole("admin"); // Role + MFA AAL2 before reading bytes.
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return response({ error: "invalid_client" }, 400);
  if (!sameOrigin(request)) return response({ error: "request_not_authorized" }, 403);
  if (!await getClientForPrivateFileAdministration(clientId)) {
    return response({ error: "client_not_found" }, 404);
  }
  let form: FormData | null = null;
  try { form = await boundedForm(request); }
  catch { return response({ error: "invalid_photo_upload" }, 413); }
  if (!form) return response({ error: "invalid_photo_upload" }, 413);
  if ([...form.keys()].some((key) => !allowedKeys.includes(key))
    || allowedKeys.some((key) => form!.getAll(key).length !== 1)) {
    return response({ error: "invalid_photo_request" }, 400);
  }
  const photo = form.get("photo");
  const batchId = form.get("batch_id");
  const sourceId = form.get("source_id");
  const sourceHash = form.get("sha256");
  if (!(photo instanceof File) || photo.size < 1 || photo.size > MAX_PHOTO_BYTES
    || photo.name.length > 255 || !/\.(jpg|jpeg|png)$/i.test(photo.name)
    || typeof batchId !== "string" || !isUuid(batchId)
    || typeof sourceId !== "string" || !SOURCE.test(sourceId)
    || typeof sourceHash !== "string" || !HASH.test(sourceHash)
    || form.get("confirmed_identity") !== "true"
    || form.get("confirmed_photo") !== "true"
    || form.get("confirmed_custody") !== "true") {
    return response({ error: "historical_photo_confirmation_required" }, 400);
  }
  try {
    const receipt = await stageHistoricalPhotoSource({
      batchId, sourceId, clientId, sourceSha256: sourceHash,
      photoBytes: new Uint8Array(await photo.arrayBuffer()),
      confirmedIdentity: true, confirmedPhoto: true, confirmedCustody: true,
    });
    return response(receipt);
  } catch {
    // Sanitized; never log file bytes, path, original name or private content.
    return response({ error: "historical_photo_stage_blocked" }, 422);
  }
}
