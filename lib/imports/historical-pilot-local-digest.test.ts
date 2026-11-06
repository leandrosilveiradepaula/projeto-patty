import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {fingerprintHistoricalPilotFiles,type HistoricalPilotFile} from "./historical-pilot-local-digest.ts";

function source(path:string,bytes:string):HistoricalPilotFile {
  const data=new TextEncoder().encode(bytes);
  return {webkitRelativePath:path,size:data.byteLength,
    async arrayBuffer(){return data.slice().buffer;}};
}
const sha=(input:string)=>createHash("sha256").update(input).digest("hex");
const files=()=>[
  source("PRIVATE_ROOT/primary.xlsx","synthetic principal xlsx"),
  source("PRIVATE_ROOT/2024-12-12/photo-a.jpg","synthetic photo first"),
  source("PRIVATE_ROOT/2024-12-12/photo-b.png","synthetic photo second"),
  source("PRIVATE_ROOT/2023-01-05/old.xlsx","synthetic nested xlsx"),
];
test("single-client full census hashes the principal, nested Excel, and dated photos",async()=>{
  const input=files();
  const result=await fingerprintHistoricalPilotFiles(input);
  assert.equal(result.source_count,4);
  assert.equal(result.principal_excel_count,1);
  assert.equal(result.additional_excel_count,1);
  assert.equal(result.photo_count,2);
  assert.equal(result.duplicate_binary_count,0);
  assert.equal(result.persistence,"none");
  assert.equal(result.import_allowed,false);
  assert.deepEqual(result.sources.map(s=>s.source_id),
    ["source_0001","source_0002","source_0003","source_0004"]);
  assert.ok(result.sources.some(s=>s.sha256===sha("synthetic nested xlsx")
    &&s.location==="additional_xlsx_pending_review"));
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_ROOT|primary\.xlsx|photo-a|2024-12-12|synthetic/);
  assert.deepEqual(result,await fingerprintHistoricalPilotFiles(input.slice().reverse()));
});
test("duplicate binary photos are kept as distinct pending sources",async()=>{
  const result=await fingerprintHistoricalPilotFiles([
    source("ROOT/main.xlsx","a principal"),
    source("ROOT/a.jpg","same photo"),source("ROOT/b.jpg","same photo"),
  ]);
  assert.equal(result.source_count,3);
  assert.equal(result.duplicate_binary_count,2);
  assert.equal(result.sources.filter(s=>s.duplicate_binary).length,2);
  assert.notEqual(result.sources[1]?.source_id,result.sources[2]?.source_id);
});
test("a pilot with 16 inputs recognizes the three additional workbooks and 12 photos",async()=>{
  const input=[
    source("ROOT/main.xlsx","principal"),
    ...Array.from({length:3},(_,i)=>source(`ROOT/2022/extra${i}.xlsx`,`extra ${i}`)),
    ...Array.from({length:12},(_,i)=>source(`ROOT/2024-12-12/photo${i}.jpg`,`photo ${i}`)),
  ];
  const result=await fingerprintHistoricalPilotFiles(input);
  assert.equal(result.source_count,16);
  assert.equal(result.principal_excel_count,1);
  assert.equal(result.additional_excel_count,3);
  assert.equal(result.photo_count,12);
});
test("fail-closed for mixed clients, unsupported, duplicates, oversized, absent principal",async()=>{
  const cases=[
    [source("ROOT/main.xlsx","ok"),source("OTHER/photo.jpg","other")],
    [source("ROOT/main.xlsx","ok"),source("ROOT/report.pdf","other")],
    [source("ROOT/main.xlsx","ok"),source("ROOT/main.xlsx","again")],
    [source("ROOT/dated/deep.xlsx","only nested")],
    [source("ROOT/main.xlsx","ok"),source("ROOT/../photo.jpg","other")],
  ];
  for(const input of cases)await assert.rejects(
    fingerprintHistoricalPilotFiles(input),/historical_pilot_local_fingerprint_blocked/);
  const tooLarge={...source("ROOT/img.jpg","small"),size:10*1024*1024+1};
  await assert.rejects(fingerprintHistoricalPilotFiles([
    source("ROOT/main.xlsx","ok"),tooLarge,
  ]),/historical_pilot_local_fingerprint_blocked/);
});
test("hash only after explicit invocation and reject changed or unreadable bytes",async()=>{
  let reads=0;
  const bad:HistoricalPilotFile={
    webkitRelativePath:"ROOT/main.xlsx",size:5,
    async arrayBuffer(){reads++;return new Uint8Array(4).buffer;},
  };
  assert.equal(reads,0);
  await assert.rejects(fingerprintHistoricalPilotFiles([bad]),
    /historical_pilot_local_fingerprint_blocked/);
  assert.equal(reads,1);
  await assert.rejects(fingerprintHistoricalPilotFiles([{
    ...bad,async arrayBuffer(){throw new Error("PRIVATE_FILE_NAME");},
  }]),error=>error instanceof Error
    &&error.message==="historical_pilot_local_fingerprint_blocked");
});
