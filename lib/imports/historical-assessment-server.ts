import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/auth";
import { previewHistoricalDirectFiles, extractHistoricalDirectXlsxCells } from "@/lib/imports/historical-archive-preview";
import { validateHistoricalMeasurementSelections } from "@/lib/imports/historical-assessment-review";
import { prepareHistoricalAssessmentSnapshot } from "@/lib/imports/historical-assessment-snapshot";
import { isUuid } from "@/lib/validation/uuid";
import type { Json } from "@/lib/supabase/database.types";

const BUCKET = "historical-originals-private";
const HASH = /^[a-f0-9]{64}$/;
const SOURCE = /^source_[0-9]{4}$/;
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function stageHistoricalAssessmentSource(input: Readonly<{
  batchId: string; sourceId: string; clientId: string;
  excelBytes: Uint8Array; sourceSha256: string; layoutSha256: string;
  assessedOn: string; selections: unknown; proposalSha256: string;
  confirmedIdentity: boolean; confirmedMapping: boolean; confirmedCustody: boolean;
}>): Promise<{ import_id: string; state: "staged_private"; source_id: string; measurement_count: number }> {
  const { profileId } = await requireRole("admin");
  const blocked = (): never => { throw new Error("historical_assessment_stage_blocked"); };
  if (!isUuid(input.batchId) || !isUuid(input.clientId) || !SOURCE.test(input.sourceId)
    || !HASH.test(input.sourceSha256) || !HASH.test(input.layoutSha256)
    || !HASH.test(input.proposalSha256) || input.confirmedIdentity !== true
    || input.confirmedMapping !== true || input.confirmedCustody !== true
    || !(input.excelBytes instanceof Uint8Array)
    || input.excelBytes.byteLength < 1 || input.excelBytes.byteLength > 20 * 1024 * 1024) blocked();
  const selected = validateHistoricalMeasurementSelections(input.selections);
  if (!selected) blocked();
  const session = await createClient();
  const { data: source, error: sourceError } = await session.from("historical_initial_load_sources")
    .select("kind,state,proposed_client_id,source_sha256,layout_signature_sha256")
    .eq("batch_id",input.batchId).eq("source_id",input.sourceId).maybeSingle();
  if (sourceError || source?.kind !== "xlsx"
    || source?.state !== "pending_backend_identity_verification"
    || source.proposed_client_id !== input.clientId
    || source.source_sha256 !== input.sourceSha256
    || source.layout_signature_sha256 !== input.layoutSha256) blocked();

  const preview = previewHistoricalDirectFiles(input.excelBytes,[]);
  if (preview.excel.state !== "recognized_unmapped"
    || preview.excel.sha256 !== input.sourceSha256
    || preview.excel.column_signature_sha256 !== input.layoutSha256
    || digest(input.excelBytes) !== input.sourceSha256) blocked();
  const columns = new Map<string,{sheet_index:number;column_index:number}>();
  for (const s of selected) columns.set(s.sheet_index+":"+s.column_index,
    {sheet_index:s.sheet_index,column_index:s.column_index});
  const cells = extractHistoricalDirectXlsxCells(input.excelBytes,
    {sha256:input.sourceSha256,column_signature_sha256:input.layoutSha256},[...columns.values()]);
  const snapshot = prepareHistoricalAssessmentSnapshot({
    clientId:input.clientId,sourceSha256:input.sourceSha256,
    layoutSha256:input.layoutSha256,assessedOn:input.assessedOn,
    cells:cells.cells,selections:selected,expectedProposalSha256:input.proposalSha256,
  });
  const path = `${input.batchId}/${input.sourceId}/${input.sourceSha256}.xlsx`;
  const elevated = createAdminClient();
  const {error:uploadError} = await elevated.storage.from(BUCKET).upload(path,input.excelBytes,{
    contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    cacheControl:"0",upsert:false,
  });
  if(uploadError) {
    const {data:original,error:downloadError} = await elevated.storage.from(BUCKET).download(path);
    if(downloadError || !original || original.size !== input.excelBytes.byteLength
      || digest(new Uint8Array(await original.arrayBuffer())) !== input.sourceSha256) blocked();
  }
  const {data:receiptId,error:rpcError} = await elevated.rpc("stage_historical_assessment_source",{
    p_batch_id:input.batchId,p_source_id:input.sourceId,p_client_id:input.clientId,
    p_source_sha256:input.sourceSha256,p_layout_signature_sha256:input.layoutSha256,
    p_assessed_on:snapshot.assessedOn,p_proposal_sha256:snapshot.proposalSha256,
    p_storage_path:path,p_mapping_snapshot:snapshot.mapping as unknown as Json,
    p_original_measurements:snapshot.originals as unknown as Json,
    p_actor_profile_id:profileId,p_confirmed_identity:true,
    p_confirmed_mapping:true,p_confirmed_custody:true,
  });
  if(rpcError || !receiptId) blocked();
  return {import_id:receiptId,state:"staged_private",
    source_id:input.sourceId,measurement_count:snapshot.originals.length};
}
