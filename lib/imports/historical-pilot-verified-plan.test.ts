import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {syntheticXlsx,syntheticPng} from "../../tests/fixtures/imports/synthetic-archives.ts";
import {previewHistoricalDirectFiles} from "./historical-archive-preview.ts";
import {prepareHistoricalInitialLoadRegistration} from "./historical-initial-load-ledger.ts";
import {makeVerifiedHistoricalPilotPlan,type VerifiedPilotSource} from "./historical-pilot-verified-plan.ts";
import type {HistoricalPilotFingerprint} from "./historical-pilot-local-digest.ts";

const clientId="22222222-2222-4222-8222-222222222222";
const batchId="11111111-1111-4111-8111-111111111111";
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
function fixture(){
  const excel=syntheticXlsx();
  const png=syntheticPng;
  const excelInfo=previewHistoricalDirectFiles(excel,[]).excel;
  const photoInfo=previewHistoricalDirectFiles(new Uint8Array(),[png]).photos[0]!;
  assert.equal(excelInfo.state,"recognized_unmapped");
  assert.equal(photoInfo.state,"candidate_private_photo");
  const originals=[
    {kind:"xlsx" as const,sha256:hash(excel),layout_signature_sha256:excelInfo.column_signature_sha256!,
      worksheet_count:excelInfo.worksheet_count!,location:"principal_xlsx" as const},
    {kind:"photo" as const,sha256:hash(png),photo_type:"png" as const,
      location:"photo_pending_review" as const},
  ].sort((a,b)=>a.sha256.localeCompare(b.sha256));
  const fingerprint:HistoricalPilotFingerprint={
    state:"local_only_pending_professional_review",persistence:"none",import_allowed:false,
    source_count:2,principal_excel_count:1,additional_excel_count:0,photo_count:1,
    duplicate_binary_count:0,inventory_sha256:"0".repeat(64),
    sources:originals.map((source,i)=>({
      source_id:"source_"+String(i+1).padStart(4,"0"),
      sha256:source.sha256,kind:source.kind,location:source.location,duplicate_binary:false,
    })),
  };
  const verified:VerifiedPilotSource[]=originals.map((source,i)=>({
    source_id:"source_"+String(i+1).padStart(4,"0"),
    sha256:source.sha256,kind:source.kind,
    ...(source.kind==="xlsx"?{
      layout_signature_sha256:(source as typeof originals[0]).layout_signature_sha256,
      worksheet_count:(source as typeof originals[0]).worksheet_count,
    }:{photo_type:"png" as const}),
  }));
  return {fingerprint,verified};
}
test("verified pilot assembles the exact append-only ledger manifest without filenames",()=>{
  const {fingerprint,verified}=fixture();
  const plan=makeVerifiedHistoricalPilotPlan(fingerprint,verified,clientId);
  assert.equal(plan.files.length,2);
  assert.equal(plan.input_errors.length,0);
  assert.equal(plan.totals.pending_backend_identity_verification,2);
  assert.equal(plan.import_allowed,false);
  assert.equal(plan.identity_verification,"authorized_backend_required");
  assert.equal(plan.files.every(source=>source.client_id===clientId),true);
  assert.deepEqual(makeVerifiedHistoricalPilotPlan(fingerprint,[...verified].reverse(),clientId),plan);
  const batch=prepareHistoricalInitialLoadRegistration(plan,batchId);
  assert.equal(batch.sources.length,2);
  assert.match(batch.manifest_sha256,/^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(plan),/private filename|\.xlsx|\.png|C:\\/);
});
test("mismatched hashes, invalid client, incomplete metadata, extra PII fail closed",()=>{
  const {fingerprint,verified}=fixture();
  const changes=[
    () =>makeVerifiedHistoricalPilotPlan(fingerprint,verified,"not-a-client"),
    () =>makeVerifiedHistoricalPilotPlan(fingerprint,[verified[0]!],clientId),
    () =>makeVerifiedHistoricalPilotPlan(fingerprint,verified.map(v=>({
      ...v,sha256:"f".repeat(64),
    })),clientId),
    () =>makeVerifiedHistoricalPilotPlan(fingerprint,[{
      ...verified[0]!,original_name:"PRIVATE_FAMILY",
    } as VerifiedPilotSource,verified[1]!],clientId),
    () =>makeVerifiedHistoricalPilotPlan({...fingerprint,import_allowed:true} as HistoricalPilotFingerprint,verified,clientId),
  ];
  for(const run of changes)assert.throws(run,(error:unknown)=>error instanceof Error
    &&error.message==="historical_pilot_verified_plan_blocked");
});
test("duplicate origin cannot be falsely accepted as unique pending source",()=>{
  const {fingerprint,verified}=fixture();
  const mutated={...fingerprint,sources:fingerprint.sources.map(s=>({
    ...s,duplicate_binary:true,
  }))} as HistoricalPilotFingerprint;
  assert.throws(()=>makeVerifiedHistoricalPilotPlan(mutated,verified,clientId),
    /historical_pilot_verified_plan_blocked/);
});
