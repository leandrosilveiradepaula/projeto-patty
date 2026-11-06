import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAssessmentFamilyMapping } from "./historical-assessment-family-mapping.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const sample=()=>({
  version:"historical-assessment-family-v1",
  column_signature_sha256:"a".repeat(64),
  measurements:[
    {sheet_index:0,column_index:2,row_index:3,measurement_key:"peso",unit:"kg"},
    {sheet_index:0,column_index:3,row_index:3,measurement_key:"cintura",unit:"cm"},
  ],
});
test("family mapping is pure layout metadata; dates, identities, original health values excluded",()=>{
  const x=parseAssessmentFamilyMapping(sample());
  assert.equal(x.measurements.length,2);
  assert.deepEqual(Object.keys(x).sort(),["column_signature_sha256","measurements","version"]);
  assert.doesNotMatch(JSON.stringify(x),/client_id|assessed_on|raw_value|source_id|filename/);
});
test("strict mapping refuses PII, dates, malformed coordinates, repeated cells and keys",()=>{
  const x=sample();
  const invalid:unknown[]=[
    {...x,version:"historical-registration-family-v1"},
    {...x,column_signature_sha256:"wrong"},
    {...x,client_id:"11111111-1111-4111-8111-111111111111"},
    {...x,assessed_on:"2026-01-01"},
    {...x,measurements:[]},
    {...x,measurements:[x.measurements[0],x.measurements[0]]},
    {...x,measurements:[x.measurements[0],{...x.measurements[1],measurement_key:"peso"}]},
    {...x,measurements:[{...x.measurements[0],unit:"kg - PRIVATE"}]},
    {...x,measurements:[{...x.measurements[0],raw_value:"72"}]},
    {...x,measurements:[{...x.measurements[0],sheet_index:64}]},
    {...x,measurements:[{...x.measurements[0],row_index:0}]},
    {...x,measurements:[{...x.measurements[0],column_index:0}]},
    {...x,measurements:[{...x.measurements[0],measurement_key:"__private"}]},
  ];
  for(const v of invalid)assert.throws(()=>parseAssessmentFamilyMapping(v),
    /historical_assessment_family_mapping_blocked/);
});
test("assessment family batch requires complete RLS ledger, explicit dates and separate preview/staging",()=>{
  const panel=read("components/admin/HistoricalAssessmentFamilyBatchPanel.tsx");
  const ui=read("components/admin/HistoricalAssessmentFamilyBatchStageForm.tsx");
  const page=read("app/admin/importacao-inicial/page.tsx");
  const route=read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
  const stage=read("lib/imports/historical-assessment-server.ts");
  assert.match(panel,/await requireRole\("admin"\)/);
  assert.match(panel,/getHistoricalBatchReconciliation\(batchId\)/);
  assert.match(panel,/!report.consultation_complete/);
  assert.match(panel,/report.unavailable_domains.length>0/);
  assert.match(panel,/s.domains.assessments==="not_saved"\|\|s.domains.assessments==="saved_private"/);
  assert.match(page,/HistoricalAssessmentFamilyBatchPanel/);
  assert.match(ui,/MAX_PER_RUN=5/);
  assert.match(ui,/MAX_DATES=4/);
  assert.match(ui,/crypto.subtle.digest\("SHA-256"/);
  assert.match(ui,/hash!==source.source_sha256/);
  assert.match(ui,/operation:"review_measurements"\|"stage_measurements"/);
  assert.match(ui,/assessed_on",entry.date/);
  assert.match(ui,/validDate\(entry.date\)/);
  assert.match(ui,/d.entries.every\(x=>x.id===entry.id\|\|x.date!==entry.date\)/);
  assert.match(ui,/entry.identity&&entry.mapping&&entry.custody/);
  assert.match(ui,/p.persistence!=="none"/);
  assert.match(ui,/p.state!=="staged_private"/);
  assert.match(ui,/for\(const \{source,entry\} of ready\)/);
  assert.match(route,/sameOrigin\(request\)/);
  assert.match(route,/readBoundedFormData\(request\)/);
  assert.match(stage,/stage_historical_assessment_source/);
  assert.match(stage,/upsert:false/);
  assert.doesNotMatch(panel,/createAdminClient|getPublicUrl/);
  assert.doesNotMatch(ui,/createAdminClient|console\.|client_assessments/);
  assert.doesNotMatch(stage,/\.from\("client_assessments"\)/);
});
