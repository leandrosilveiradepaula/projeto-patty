import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  reviewHistoricalAssessmentMeasurements, validateHistoricalMeasurementSelections,
} from "./historical-assessment-review.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const clientId="11111111-1111-4111-8111-111111111111";
const sourceSha256="a".repeat(64);
const layoutSha256="b".repeat(64);
const selected=()=>[{sheet_index:0,column_index:2,row_index:3,measurement_key:"peso",unit:"kg"}];
const cells=()=>[{sheet_index:0,column_index:2,row_index:3,raw_type:"n",raw_value:"72,5"}];
const input=()=>({clientId,sourceSha256,layoutSha256,assessedOn:"2026-01-31",cells:cells(),selections:selected()});

test("proposal digests exact patient-only-in-memory values but returns no health values",()=>{
 const a=reviewHistoricalAssessmentMeasurements(input());
 assert.equal(a.state,"pending_professional_review");
 assert.equal(a.persistence,"none");
 assert.equal(a.approval,"human_required");
 assert.equal(a.proposed_measurement_count,1);
 assert.match(a.proposal_sha256??"",/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(a),/72,5|peso|kg|11111111/);
 assert.deepEqual(a,reviewHistoricalAssessmentMeasurements(input()));
 assert.notEqual(a.proposal_sha256,reviewHistoricalAssessmentMeasurements({
   ...input(),cells:[{...cells()[0]!,raw_value:"72,6"}],
 }).proposal_sha256);
});

test("date and decimal ambiguity, missing cells, duplicates and unconfirmed mappings block",()=>{
 for(const invalid of [
  {...input(),assessedOn:"2026-02-30"},
  {...input(),assessedOn:"1900-13-01"},
  {...input(),assessedOn:""},
  {...input(),cells:[]},
  {...input(),cells:[...cells(),...cells()]},
  {...input(),cells:[{...cells()[0]!,raw_value:"72.5.1"}]},
  {...input(),cells:[{...cells()[0]!,raw_value:"1,000.25"}]},
  {...input(),cells:[{...cells()[0]!,raw_value:"=SUM(1,1)"}]},
  {...input(),cells:[{...cells()[0]!,raw_type:"e",raw_value:"72.5"}]},
  {...input(),selections:[...selected(),...selected()]},
  {...input(),selections:[{...selected()[0]!,unit:""}]},
  {...input(),selections:[{...selected()[0]!,measurement_key:"Altura"}]},
 ]) {
  assert.equal(reviewHistoricalAssessmentMeasurements(invalid).state,"blocked");
 }
 assert.equal(validateHistoricalMeasurementSelections([{...selected()[0]!,raw_value:"secret"}]),null);
});

test("UI/route only inspects selected cells and never persists or publishes evaluations",()=>{
 const page=read("app/admin/clientes/[clienteId]/importacao/page.tsx");
 const route=read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
 const form=read("components/admin/HistoricalAssessmentReviewForm.tsx");
 const module=read("lib/imports/historical-assessment-review.ts");
 assert.match(page,/HistoricalAssessmentReviewForm/);
 assert.match(route,/await requireRole\("admin"\)/);
 assert.match(route,/sameOrigin\(request\)/);
 assert.match(route,/readBoundedFormData\(request\)/);
 assert.match(route,/operation === "review_measurements"/);
 assert.match(route,/extractHistoricalDirectXlsxCells/);
 assert.match(route,/reviewHistoricalAssessmentMeasurements/);
 assert.match(route,/form\.get\("confirmed_identity"\) !== "true"/);
 assert.match(form,/state !== "pending_professional_review"/);
 assert.match(form,/operation", operation/);
 assert.match(module,/persistence: "none"/);
 assert.doesNotMatch(module+form,/createAdminClient|getPublicUrl\(|\.from\("client_assessments"\)|\.insert\(|console\./);
});
