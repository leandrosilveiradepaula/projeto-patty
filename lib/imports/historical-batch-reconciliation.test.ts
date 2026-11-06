import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  historicalBatchCsv,reconcileHistoricalBatch,
  type HistoricalBatchSource,type HistoricalBatchReceipt,
} from "./historical-batch-reconciliation.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p:string)=>readFileSync(path.join(root,p),"utf8");
const client="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const batch="33333333-3333-4333-8333-333333333333";
const layout="b".repeat(64),sha="a".repeat(64);
const source=(i:number,kind:"xlsx"|"photo"="xlsx"):HistoricalBatchSource=>({
  source_id:"source_"+String(i).padStart(4,"0"),source_sha256:sha,
  kind,state:"pending_backend_identity_verification",
  reason:null,proposed_client_id:client,
  layout_signature_sha256:kind==="photo"?null:layout,
});
const receipt=(i:number,extra:Partial<HistoricalBatchReceipt>={}):HistoricalBatchReceipt=>({
  id:"44444444-4444-4444-8444-"+String(i).padStart(12,"0"),
  source_id:"source_"+String(i).padStart(4,"0"),source_sha256:sha,
  state:"staged_private",client_id:client,...extra,
});
function run(sources:HistoricalBatchSource[],v:Partial<{
  anamnesis:HistoricalBatchReceipt[]|null;
  assessments:HistoricalBatchReceipt[]|null;
  registration:HistoricalBatchReceipt[]|null;
  photos:HistoricalBatchReceipt[]|null;
}>={},declared=sources.length){
  return reconcileHistoricalBatch({
    batchId:batch,declaredCount:declared,sources,completeReads:true,
    receipts:{anamnesis:[],assessments:[],registration:[],photos:[],...v},
  });
}

test("full inventory beyond first 100, distinct domains, layout families and photo scope",()=>{
 const sources=Array.from({length:110},(_,i)=>source(i+1));
 sources.push(source(111,"photo"));
 const r=run(sources,{
  anamnesis:[receipt(1,{layout_signature_sha256:layout})],
  assessments:[
    receipt(2,{layout_signature_sha256:layout,assessed_on:"2026-01-01"}),
    receipt(2,{id:other,layout_signature_sha256:layout,assessed_on:"2026-02-02"}),
  ],
  registration:[receipt(3,{layout_signature_sha256:layout})],
  photos:[receipt(111)],
 });
 assert.equal(r.observed_count,111);
 assert.equal(r.count_matches,true);
 assert.equal(r.consultation_complete,true);
 assert.equal(r.can_claim_import_complete,false);
 assert.equal(r.source_counts.xlsx,110);
 assert.equal(r.source_counts.photos,1);
 assert.equal(r.families[0]?.source_count,110);
 assert.equal(r.families[0]?.anamnesis_saved,1);
 assert.equal(r.families[0]?.assessments_saved,1);
 assert.equal(r.families[0]?.registration_saved,1);
 assert.equal(r.sources.find(s=>s.source_id==="source_0002")?.assessment_receipt_count,2);
 assert.equal(r.sources.find(s=>s.source_id==="source_0002")?.domains.assessments,"saved_private");
 assert.equal(r.sources.find(s=>s.source_id==="source_0111")?.domains.photos,"saved_private");
 assert.equal(r.sources.find(s=>s.source_id==="source_0111")?.domains.anamnesis,"not_applicable");
 assert.equal(r.sources.find(s=>s.source_id==="source_0004")?.domains.anamnesis,"not_saved");
 assert.equal(r.source_counts.without_any_receipt,107);
});

test("unavailable domains never imply zero imports or global completion",()=>{
 const r=run([source(1),source(2,"photo")],{anamnesis:null,photos:null});
 assert.equal(r.consultation_complete,false);
 assert.deepEqual(r.unavailable_domains,["anamnesis","photos"]);
 assert.equal(r.orphan_receipt_count.photos,null);
 assert.equal(r.sources[0]?.domains.anamnesis,"unavailable");
 assert.equal(r.sources[1]?.domains.photos,"unavailable");
 assert.equal(r.can_claim_import_complete,false);
});

test("mismatched clients, hashes, layouts and replay dates cannot be certified",()=>{
 const base=receipt(1,{layout_signature_sha256:layout});
 for(const altered of [
  {client_id:other},{source_sha256:"c".repeat(64)},
  {layout_signature_sha256:"d".repeat(64)},{state:"published"},
 ]){
  const r=run([source(1)],{anamnesis:[{...base,...altered}]});
  assert.equal(r.sources[0]?.domains.anamnesis,"conflict");
 }
 const dupDate=run([source(1)],{assessments:[
  receipt(1,{layout_signature_sha256:layout,assessed_on:"2026-02-01"}),
  receipt(1,{id:other,layout_signature_sha256:layout,assessed_on:"2026-02-01"}),
 ]});
 assert.equal(dupDate.sources[0]?.domains.assessments,"conflict");
 const duplicate=run([source(1)],{registration:[receipt(1),receipt(1,{id:other})]});
 assert.equal(duplicate.sources[0]?.domains.registration,"conflict");
});

test("orphan and wrong-kind receipt, blocked source and mismatched census are explicit",()=>{
 const r=run([source(1),source(2,"photo")],{
  photos:[receipt(1),receipt(50)],
 },3);
 assert.equal(r.count_matches,false);
 assert.equal(r.consultation_complete,false);
 assert.equal(r.orphan_receipt_count.photos,2);
 const blocked=run([{...source(1),state:"blocked",reason:"unsupported_or_invalid",proposed_client_id:null}],{
  registration:[receipt(1)],
 });
 assert.equal(blocked.sources[0]?.domains.registration,"conflict");
 const pending=run([{...source(1),state:"duplicate_binary",reason:"duplicate_binary",proposed_client_id:null}]);
 assert.equal(pending.sources[0]?.domains.registration,"blocked");
});

test("CSV contains every opaque source but never fields, values, names or dangerous formulas",()=>{
 const src=Array.from({length:105},(_,i)=>source(i+1));
 const r=run(src);
 const csv=historicalBatchCsv(r);
 assert.equal(csv.split("\r\n").filter(Boolean).length,106);
 assert.match(csv,/source_0105/);
 assert.match(csv,/not_saved/);
 assert.doesNotMatch(csv,/raw_value|original_fields|original_answers|full_name|contact_email|storage_path|SYNTHETIC_CITY/);
 assert.doesNotMatch(csv,/^\s*[=+@]/m);
});

test("admin-only RLS server, exported CSV route and UI fail closed with no elevated key",()=>{
 const server=read("lib/imports/historical-batch-report-server.ts");
 const panel=read("components/admin/HistoricalBatchReconciliationPanel.tsx");
 const route=read("app/api/admin/historical-initial-load/reconciliation/route.ts");
 const page=read("app/admin/importacao-inicial/page.tsx");
 assert.match(server,/import "server-only"/);
 assert.match(server,/await requireRole\("admin"\)/);
 assert.match(server,/await createClient\(\)/);
 assert.match(server,/\.range\(start,start\+PER_PAGE-1\)/);
 assert.match(server,/count:"exact"/);
 assert.match(server,/return \{rows:null,complete:false\}/);
 assert.doesNotMatch(server,/createAdminClient|service_role|console\./);
 assert.match(route,/await requireRole\("admin"\)/);
 assert.match(route,/Cache-Control":"private, no-store"/);
 assert.match(route,/Content-Disposition/);
 assert.match(route,/historicalBatchCsv/);
 assert.match(panel,/consultation_complete/);
 assert.match(panel,/unavailable_domains/);
 assert.match(page,/HistoricalBatchReconciliationPanel/);
 assert.doesNotMatch(panel,/original_answers|original_fields|raw_value|getPublicUrl/);
});
