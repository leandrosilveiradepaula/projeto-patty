import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { prepareHistoricalAssessmentSnapshot } from "./historical-assessment-snapshot.ts";
import { reviewHistoricalAssessmentMeasurements } from "./historical-assessment-review.ts";

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(base,p),"utf8");
const clientId="11111111-1111-4111-8111-111111111111";
const sourceSha256="a".repeat(64),layoutSha256="b".repeat(64);
const cells=[{sheet_index:0,column_index:2,row_index:3,raw_type:"n",raw_value:"72,5"}];
const selections=[{sheet_index:0,column_index:2,row_index:3,measurement_key:"peso",unit:"kg"}];
const args=()=>({clientId,sourceSha256,layoutSha256,assessedOn:"2026-02-01",cells,selections});
const fingerprint=()=>reviewHistoricalAssessmentMeasurements(args()).proposal_sha256!;

test("original values and coordinates are preserved; review hash matches snapshot",()=>{
 const snapshot=prepareHistoricalAssessmentSnapshot({
   ...args(),expectedProposalSha256:fingerprint(),
 });
 assert.equal(snapshot.proposalSha256,fingerprint());
 assert.deepEqual(snapshot.mapping,selections);
 assert.deepEqual(snapshot.originals,[{...selections[0],raw_type:"n",raw_value:"72,5",numeric_value:"72.5"}]);
 const digest=createHash("sha256").update(JSON.stringify({
   version:"historical-assessment-review-v1",client_id:clientId,
   source_sha256:sourceSha256,layout_sha256:layoutSha256,
   assessed_on:"2026-02-01",measurements:snapshot.originals,
 }),"utf8").digest("hex");
 assert.equal(digest,snapshot.proposalSha256);
 assert.throws(()=>prepareHistoricalAssessmentSnapshot({
   ...args(),expectedProposalSha256:"0".repeat(64),
 }),/historical_assessment_snapshot_blocked/);
});

test("read-only review/route are extended with explicit three independent confirmations",()=>{
 const route=read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
 const form=read("components/admin/HistoricalAssessmentReviewForm.tsx");
 const server=read("lib/imports/historical-assessment-server.ts");
 const list=read("components/admin/HistoricalAssessmentStagedList.tsx");
 assert.match(route,/await requireRole\("admin"\)/);
 assert.match(route,/sameOrigin\(request\)/);
 assert.match(route,/readBoundedFormData\(request\)/);
 assert.match(route,/stage_measurements/);
 assert.match(route,/expectedHash !== review.proposal_sha256/);
 for(const flag of ["confirmed_identity","confirmed_mapping","confirmed_custody"])
   assert.match(route+form,new RegExp(flag));
 assert.match(form,/Guard ar medidas históricas privadas|Guardar medidas históricas privadas/);
 assert.match(form,/!mappingConfirmed \|\| !custodyConfirmed/);
 assert.match(server,/import "server-only"/);
 assert.match(server,/await requireRole\("admin"\)/);
 assert.match(server,/await createClient\(\)/);
 assert.match(server,/\.eq\("batch_id",input.batchId\)/);
 assert.match(server,/\.eq\("source_id",input.sourceId\)/);
 assert.match(server,/upsert:false/);
 assert.match(server,/original.arrayBuffer\(\)/);
 assert.match(server,/stage_historical_assessment_source/);
 assert.match(list,/await requireRole\("admin"\)/);
 assert.match(list,/historical_assessment_imports/);
 assert.doesNotMatch(list,/original_measurements|mapping_snapshot|storage_path/);
 assert.doesNotMatch(form,/createAdminClient|console\./);
 assert.doesNotMatch(server,/\.from\("client_assessments"\)|\.from\("assessment_measurements"\)/);
});

test("new SQL source is append-only, RLS admin AAL2 and RPC service-role only",()=>{
 const sql=read("supabase/migrations/20261106024500_historical_assessment_private_staging.sql");
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FOR SELECT TO authenticated/);
 assert.match(sql,/auth.jwt\(\) ->> 'aal'/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/UNIQUE \(batch_id, source_id, assessed_on\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/original_measurements/);
 assert.match(sql,/mapping_snapshot/);
 assert.doesNotMatch(sql,/FOR (UPDATE|DELETE|INSERT) TO authenticated/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE TABLE|client_assessments.*INSERT/);
 assert.match(read(".github/workflows/validate-method-configuration-foundation.yml"),
   /historical_assessment_private_staging\.test\.sql/);
});
