import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/auth";
import { isUuid } from "@/lib/validation/uuid";
import { previewHistoricalDirectFiles, extractHistoricalDirectXlsxCells } from "@/lib/imports/historical-archive-preview";
import { reviewHistoricalDirectAnamnesisMapping, type HistoricalCellSelection } from "@/lib/imports/historical-direct-anamnesis-mapping";
import { getPublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import type { Json } from "@/lib/supabase/database.types";

const BUCKET = "historical-originals-private";
const SOURCE_ID = /^source_[0-9]{4}$/;
const HASH = /^[a-f0-9]{64}$/;
const digest = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const blocked = (reason: string): never => {
  // Only fixed error codes. Never include original contents or Storage paths.
  throw new Error(reason);
};

/**
 * Persist the ORIGINAL XLSX privately and an immutable, client-scoped historic
 * answer snapshot. This is not a new client Anamnesis submission or consent.
 * The three professional attestations are independent and mandatory.
 */
export async function stageHistoricalAnamnesisSource(params: Readonly<{
  batchId: string;
  sourceId: string;
  clientId: string;
  excelBytes: Uint8Array;
  sourceSha256: string;
  layoutSha256: string;
  formVersionId: string;
  selections: readonly HistoricalCellSelection[];
  confirmedIdentity: boolean;
  confirmedMapping: boolean;
  confirmedCustody: boolean;
}>): Promise<{ import_id: string; state: "staged_private"; source_id: string; answer_count: number }> {
  const { profileId } = await requireRole("admin");
  if (!isUuid(params.batchId) || !SOURCE_ID.test(params.sourceId) || !isUuid(params.clientId)
      || !isUuid(params.formVersionId) || !HASH.test(params.sourceSha256)
      || !HASH.test(params.layoutSha256) || !(params.excelBytes instanceof Uint8Array)
      || params.excelBytes.byteLength < 1 || params.excelBytes.byteLength > 20 * 1024 * 1024
      || !Array.isArray(params.selections) || params.selections.length < 1
      || params.selections.length > 64
      || params.confirmedIdentity !== true || params.confirmedMapping !== true
      || params.confirmedCustody !== true) blocked("historical_stage_invalid_request");

  // Verify the inventory under the admin's own session and RLS, NOT through
  // privileged bypass. Only a proposed link with matching identity is eligible.
  const session = await createClient();
  const { data: source, error: sourceError } = await session
    .from("historical_initial_load_sources")
    .select("kind,state,proposed_client_id,source_sha256,layout_signature_sha256")
    .eq("batch_id", params.batchId)
    .eq("source_id", params.sourceId)
    .maybeSingle();
  if (sourceError || source?.kind !== "xlsx"
      || source?.state !== "pending_backend_identity_verification"
      || source?.proposed_client_id !== params.clientId
      || source?.source_sha256 !== params.sourceSha256
      || source?.layout_signature_sha256 !== params.layoutSha256) {
    blocked("historical_stage_unverified_source");
  }

  const checked = previewHistoricalDirectFiles(params.excelBytes, []);
  if (checked.excel.state !== "recognized_unmapped"
      || checked.excel.sha256 !== params.sourceSha256
      || checked.excel.column_signature_sha256 !== params.layoutSha256
      || digest(params.excelBytes) !== params.sourceSha256) blocked("historical_stage_source_changed");

  const published = await getPublishedHistoricalAnamnesisTargets();
  if (!published || published.form_version_id !== params.formVersionId) {
    blocked("historical_stage_version_changed");
  }
  const distinctColumns = new Map<string, { sheet_index: number; column_index: number }>();
  for (const selection of params.selections) {
    if (!selection || !Number.isSafeInteger(selection.sheet_index)
      || !Number.isSafeInteger(selection.column_index) || !Number.isSafeInteger(selection.row_index)
      || !isUuid(selection.question_id)) blocked("historical_stage_invalid_mapping");
    distinctColumns.set(selection.sheet_index + ":" + selection.column_index, {
      sheet_index: selection.sheet_index, column_index: selection.column_index,
    });
  }
  const extracted = extractHistoricalDirectXlsxCells(params.excelBytes,
    { sha256: params.sourceSha256, column_signature_sha256: params.layoutSha256 },
    [...distinctColumns.values()]);
  const review = reviewHistoricalDirectAnamnesisMapping({
    client_id: params.clientId, form_version_id: params.formVersionId,
    source: { sha256: params.sourceSha256, column_signature_sha256: params.layoutSha256 },
    cells: extracted.cells, selections: params.selections,
    questions: published.questions,
  });
  if (review.state !== "pending_professional_review" || !review.proposal_sha256) {
    blocked("historical_stage_mapping_blocked");
  }
  const cells = new Map(extracted.cells.map(cell => [
    `${cell.sheet_index}:${cell.column_index}:${cell.row_index}`, cell
  ]));
  const answers = params.selections.map(selection => {
    const cell = cells.get(`${selection.sheet_index}:${selection.column_index}:${selection.row_index}`);
    if (!cell) return blocked("historical_stage_missing_cell");
    return {
      question_id: selection.question_id,
      sheet_index: selection.sheet_index,
      column_index: selection.column_index,
      row_index: selection.row_index,
      raw_type: cell.raw_type,
      raw_value: cell.raw_value,
    };
  }).sort((a,b) => a.question_id.localeCompare(b.question_id));
  const mapping = answers.map(({ question_id, sheet_index, column_index, row_index }) => ({
    question_id, sheet_index, column_index, row_index,
  }));

  const storagePath = `${params.batchId}/${params.sourceId}/${params.sourceSha256}.xlsx`;
  const elevated = createAdminClient(); // server-only secret
  const { error: uploadError } = await elevated.storage.from(BUCKET).upload(
    storagePath, params.excelBytes, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      cacheControl: "0", upsert: false,
    });
  if (uploadError) {
    // A previous request may have uploaded bytes before an interrupted RPC.
    // Never trust an existing object merely because its path matches a hash.
    const { data: original, error: downloadError } = await elevated.storage.from(BUCKET)
      .download(storagePath);
    if (downloadError || !original
      || digest(new Uint8Array(await original.arrayBuffer())) !== params.sourceSha256) {
      blocked("historical_stage_original_unavailable");
    }
  }

  const { data: id, error: databaseError } = await elevated.rpc("stage_historical_anamnesis_source", {
    p_batch_id: params.batchId,
    p_source_id: params.sourceId,
    p_client_id: params.clientId,
    p_source_sha256: params.sourceSha256,
    p_layout_signature_sha256: params.layoutSha256,
    p_form_version_id: params.formVersionId,
    p_proposal_sha256: review.proposal_sha256,
    p_storage_path: storagePath,
    p_mapping_snapshot: mapping as unknown as Json,
    p_original_answers: answers as unknown as Json,
    p_actor_profile_id: profileId,
    p_confirmed_identity: true,
    p_confirmed_mapping: true,
    p_confirmed_custody: true,
  });
  if (databaseError || !id) blocked("historical_stage_database_blocked");
  return {
    import_id: id, state: "staged_private", source_id: params.sourceId,
    answer_count: answers.length,
  };
}
