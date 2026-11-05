import "server-only";
import { createHash } from "node:crypto";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewHistoricalDirectFiles } from "@/lib/imports/historical-archive-preview";
import { prepareReviewedHistoricalPhoto } from "@/lib/imports/historical-photo-staging";

const BUCKET = "client-private";
const digest = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

/**
 * Historic photo is a distinct, private file with an immutable source receipt.
 * An explicit inventory proposal is NOT identity proof; the three human review
 * decisions must be made for this individual source.
 */
export async function stageHistoricalPhotoSource(input: Readonly<{
  batchId: string;
  sourceId: string;
  clientId: string;
  sourceSha256: string;
  photoBytes: Uint8Array;
  confirmedIdentity: boolean;
  confirmedPhoto: boolean;
  confirmedCustody: boolean;
}>): Promise<{ import_id: string; file_id: string; state: "staged_private"; source_id: string }> {
  const { profileId } = await requireRole("admin");
  if (input.confirmedIdentity !== true || input.confirmedPhoto !== true
    || input.confirmedCustody !== true) throw new Error("historical_photo_review_required");

  const photo = prepareReviewedHistoricalPhoto({
    batchId: input.batchId, sourceId: input.sourceId,
    clientId: input.clientId, sourceSha256: input.sourceSha256,
    bytes: input.photoBytes,
  });
  const parsed = previewHistoricalDirectFiles(new Uint8Array(), [input.photoBytes]);
  if (parsed.photos.length !== 1 || parsed.photos[0]?.state !== "candidate_private_photo"
    || parsed.photos[0]?.sha256 !== photo.source_sha256
    || parsed.photos[0]?.kind !== photo.photo_type) {
    throw new Error("historical_photo_content_blocked");
  }

  // Source and client association verified under the administrator's RLS.
  const session = await createClient();
  const { data: source, error } = await session
    .from("historical_initial_load_sources")
    .select("kind,state,proposed_client_id,source_sha256,photo_type")
    .eq("batch_id", photo.batch_id)
    .eq("source_id", photo.source_id)
    .maybeSingle();
  if (error || source?.kind !== "photo"
    || source?.state !== "pending_backend_identity_verification"
    || source.proposed_client_id !== photo.client_id
    || source.source_sha256 !== photo.source_sha256
    || source.photo_type !== photo.photo_type) {
    throw new Error("historical_photo_ledger_blocked");
  }

  const elevated = createAdminClient(); // Server-only; NEVER sent to browser.
  const { error: uploadError } = await elevated.storage.from(BUCKET)
    .upload(photo.storage_path, input.photoBytes, {
      contentType: photo.mime_type, upsert: false, cacheControl: "0",
    });
  if (uploadError) {
    // A crashed previous attempt may have uploaded the exact photo but failed
    // to record a receipt. Never overwrite: check actual bytes before retry.
    const { data: original, error: downloadError } = await elevated.storage.from(BUCKET)
      .download(photo.storage_path);
    if (downloadError || !original || original.size !== photo.byte_size
      || digest(new Uint8Array(await original.arrayBuffer())) !== photo.source_sha256) {
      throw new Error("historical_photo_private_original_blocked");
    }
  }
  const { data: id, error: dbError } = await elevated.rpc("stage_historical_photo_source", {
    p_batch_id: photo.batch_id,
    p_source_id: photo.source_id,
    p_client_id: photo.client_id,
    p_source_sha256: photo.source_sha256,
    p_client_file_id: photo.client_file_id,
    p_mime_type: photo.mime_type,
    p_byte_size: photo.byte_size,
    p_actor_profile_id: profileId,
    p_confirmed_identity: true,
    p_confirmed_photo: true,
    p_confirmed_custody: true,
  });
  if (dbError || !id) throw new Error("historical_photo_database_blocked");
  return {
    import_id: id, file_id: photo.client_file_id,
    state: "staged_private", source_id: photo.source_id,
  };
}
