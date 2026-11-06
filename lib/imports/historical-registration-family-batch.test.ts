import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRegistrationFamilyMapping } from "./historical-registration-family-mapping.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const valid=()=>({
  version:"historical-registration-family-v1",
  column_signature_sha256:"a".repeat(64),
  fields:[
    {sheet_index:0,column_index:2,row_index:3,field_key:"city"},
    {sheet_index:0,column_index:3,row_index:3,field_key:"phone"},
  ],
});

test("maps are canonical metadata only and preserve explicit cell coordinates",()=>{
  const x=parseRegistrationFamilyMapping(valid());
  assert.equal(x.version,"historical-registration-family-v1");
  assert.equal(x.fields.length,2);
  assert.deepEqual(Object.keys(x).sort(),["column_signature_sha256","fields","version"]);
  assert.doesNotMatch(JSON.stringify(x),/raw_value|client_id|email_address|filename/);
});
test("unapproved fields, PII, duplicates and malformed coordinates are blocked",()=>{
  const x=valid();
  const invalid=[
    {...x,column_signature_sha256:"bad"},
    {...x,version:"historical-family-anamnesis-v1"},
    {...x,raw_value:"PRIVATE"},
    {...x,client_id:"11111111-1111-4111-8111-111111111111"},
    {...x,fields:[]},
    {...x,fields:[x.fields[0],x.fields[0]]},
    {...x,fields:[x.fields[0],{...x.fields[1],field_key:"city"}]},
    {...x,fields:[{...x.fields[0],field_key:"login_email"}]},
    {...x,fields:[{...x.fields[0],raw_value:"PRIVATE"}]},
    {...x,fields:[{...x.fields[0],sheet_index:64}]},
    {...x,fields:[{...x.fields[0],row_index:0}]},
  ];
  for(const v of invalid)assert.throws(()=>parseRegistrationFamilyMapping(v),
    /historical_registration_family_mapping_blocked/);
});
test("full-ledger admin and MFA gate, no ineligible sources, per-file preview and sequential staging",()=>{
  const server=read("components/admin/HistoricalRegistrationFamilyBatchPanel.tsx");
  const ui=read("components/admin/HistoricalRegistrationFamilyBatchStageForm.tsx");
  const page=read("app/admin/importacao-inicial/page.tsx");
  const route=read("app/api/admin/clients/[clientId]/historical-excel/route.ts");
  const stage=read("lib/imports/historical-registration-server.ts");
  assert.match(server,/await requireRole\("admin"\)/);
  assert.match(server,/getHistoricalBatchReconciliation\(batchId\)/);
  assert.match(server,/!report.consultation_complete/);
  assert.match(server,/report.unavailable_domains.length > 0/);
  assert.match(server,/s.domains.registration==="not_saved"/);
  assert.match(server,/s.state==="pending_backend_identity_verification"/);
  assert.match(page,/HistoricalRegistrationFamilyBatchPanel/);
  assert.match(ui,/MAX_PER_RUN=5/);
  assert.match(ui,/crypto.subtle.digest\("SHA-256"/);
  assert.match(ui,/sha!==source.source_sha256/);
  assert.match(ui,/operation:"review_registration"\|"stage_registration"/);
  assert.match(ui,/d.result==="reviewed"/);
  assert.match(ui,/confirmed_identity/);
  assert.match(ui,/confirmed_mapping/);
  assert.match(ui,/confirmed_custody/);
  assert.match(ui,/for\(const source of ready\)/);
  assert.match(route,/await requireRole\("admin"\)/);
  assert.match(route,/sameOrigin\(request\)/);
  assert.match(route,/readBoundedFormData\(request\)/);
  assert.match(stage,/stage_historical_registration_source/);
  assert.match(stage,/\.eq\("batch_id",input.batchId\)/);
  assert.match(stage,/upsert:false/);
  assert.doesNotMatch(ui,/console\.|createAdminClient|\.from\("client_registration"\)/);
  assert.doesNotMatch(server,/createAdminClient|getPublicUrl/);
});
