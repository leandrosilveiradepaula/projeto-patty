import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prepareHistoricalRegistrationReview, validateHistoricalRegistrationSelections } from "./historical-registration-review.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const clientId="11111111-1111-4111-8111-111111111111";
const cells=[{sheet_index:0,column_index:2,row_index:3,raw_type:"str",raw_value:"SYNTHETIC_CITY"}];
const selections=[{sheet_index:0,column_index:2,row_index:3,field_key:"city" as const}];
const params=()=>({clientId,sourceSha256:"a".repeat(64),layoutSha256:"b".repeat(64),cells,selections});
test("historical cadastral review preserves exact originals but does not expose PII in response",()=>{
 const r=prepareHistoricalRegistrationReview(params());
 assert.equal(r.review.state,"pending_professional_review");
 assert.equal(r.review.persistence,"none");
 assert.equal(r.review.approval,"human_required");
 assert.equal(r.review.proposed_field_count,1);
 assert.match(r.review.proposal_sha256??"",/^[0-9a-f]{64}$/);
 assert.deepEqual(r.mapping,selections);
 assert.equal(r.originals[0]?.raw_value,"SYNTHETIC_CITY");
 assert.doesNotMatch(JSON.stringify(r.review),/SYNTHETIC_CITY|city|11111111/);
 assert.notEqual(r.review.proposal_sha256,prepareHistoricalRegistrationReview({
   ...params(),cells:[{...cells[0]!,raw_value:"OTHER_SYNTHETIC_CITY"}],
 }).review.proposal_sha256);
});
test("unknown target, duplicate destination/cell, missing originals and invalid values fail closed",()=>{
 assert.equal(validateHistoricalRegistrationSelections([{...selections[0],field_key:"login_email"}]),null);
 assert.equal(validateHistoricalRegistrationSelections([selections[0],selections[0]]),null);
 assert.equal(prepareHistoricalRegistrationReview({...params(),cells:[]}).review.state,"blocked");
 assert.equal(prepareHistoricalRegistrationReview({...params(),cells:[...cells,...cells]}).review.state,"blocked");
 assert.equal(prepareHistoricalRegistrationReview({...params(),cells:[{...cells[0]!,raw_value:""}]}).review.state,"blocked");
 assert.equal(prepareHistoricalRegistrationReview({...params(),cells:[{...cells[0]!,raw_type:"e"}]}).review.state,"blocked");
});
test("admin route rechecks source and never writes to current registration or Auth",()=>{
 const route=read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
 const server=read("lib/imports/historical-registration-server.ts");
 const ui=read("components/admin/HistoricalRegistrationReviewForm.tsx");
 const list=read("components/admin/HistoricalRegistrationStagedList.tsx");
 assert.match(route,/await requireRole\("admin"\)/);
 assert.match(route,/sameOrigin\(request\)/);
 assert.match(route,/readBoundedFormData\(request\)/);
 assert.match(route,/review_registration/);
 assert.match(route,/stage_registration/);
 assert.match(route,/confirmed_identity/);
 assert.match(route,/confirmed_mapping/);
 assert.match(route,/confirmed_custody/);
 assert.match(server,/import "server-only"/);
 assert.match(server,/await requireRole\("admin"\)/);
 assert.match(server,/await createClient\(\)/);
 assert.match(server,/\.eq\("batch_id",input.batchId\)/);
 assert.match(server,/\.eq\("source_id",input.sourceId\)/);
 assert.match(server,/upsert:false/);
 assert.match(server,/original.arrayBuffer\(\)/);
 assert.match(server,/stage_historical_registration_source/);
 assert.doesNotMatch(server,/\.from\("client_registration"\)|\.from\("auth\.users"\)|console\./);
 assert.match(ui,/review_registration/);
 assert.match(ui,/stage_registration/);
 assert.match(ui,/!mapping\|\|!custody/);
 assert.match(list,/historical_registration_imports/);
 assert.doesNotMatch(list,/original_fields|mapping_snapshot|storage_path/);
});
test("SQL receipts are append-only and admin-MFA-scoped, not current Client registration",()=>{
 const sql=read("supabase/migrations/20261106031000_historical_registration_private_staging.sql");
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/auth.jwt\(\) ->> 'aal'/);
 assert.match(sql,/UNIQUE\(batch_id, source_id\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/FOR (UPDATE|INSERT|DELETE) TO authenticated/);
 assert.doesNotMatch(sql,/UPDATE public\.client_registration|INSERT INTO public\.client_registration/);
 assert.match(read(".github/workflows/validate-method-configuration-foundation.yml"),
   /historical_registration_private_staging\.test\.sql/);
});
