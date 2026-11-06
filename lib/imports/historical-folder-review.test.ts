import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  reviewHistoricalFolderSelection,proposedHistoricalFolderDate,isValidHistoricalPhotoDate,
} from "./historical-folder-review.ts";

const sample=()=>[
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_A/clinical.xlsx",size:2048},
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_A/initial.jpg",size:3000},
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_A/15.08.2023/frente.png",size:3001},
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_A/2024-09-16/lado.jpeg",size:3002},
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_B/main.xlsx",size:2048},
  {relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_B/01-02-2023/evolution.jpg",size:3000},
];
test("multiple client folders and dated photos are enumerated locally without PII",()=>{
  const result=reviewHistoricalFolderSelection(sample());
  assert.equal(result.state,"ready_for_local_review");
  assert.equal(result.files,6);
  assert.equal(result.excels,2);
  assert.equal(result.photos,4);
  assert.deepEqual(result.folders.map(f=>f.photo_count),[3,1]);
  assert.deepEqual(result.photo_candidates.map(p=>p.proposed_date),
    [null,"2023-08-15","2024-09-16","2023-02-01"]);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_|clinical|evolution|frente|\.xlsx|\.jpeg/);
});
test("date candidates are only syntactic and invalid dates are never proposed",()=>{
  for(const d of ["2023-02-30","31-02-2023","0000-12-01","12-13-2023","2023_12_01"])
    assert.equal(proposedHistoricalFolderDate(d),null);
  assert.equal(proposedHistoricalFolderDate("2024-02-29"),"2024-02-29");
  assert.equal(proposedHistoricalFolderDate("29.02.2024"),"2024-02-29");
  assert.equal(proposedHistoricalFolderDate("sample"),null);
  assert.equal(isValidHistoricalPhotoDate("2024-02-29"),true);
  assert.equal(isValidHistoricalPhotoDate("2023-02-29"),false);
});
test("unsupported paths, nested Excel, missing/multiple Excel, root mismatch fail closed",()=>{
  const cases=[
    [{relativePath:"PRIVATE_ROOT/PERSON/bad.pdf",size:1}],
    [{relativePath:"PRIVATE_ROOT/PERSON/date/medical.xlsx",size:1}],
    [{relativePath:"PRIVATE_ROOT/PERSON/p.png",size:1}],
    [...sample(),{relativePath:"PRIVATE_ROOT/PRIVATE_PERSON_A/second.xlsx",size:1}],
    [...sample(),{relativePath:"DIFFERENT/PERSON/chart.xlsx",size:1}],
    [...sample(),sample()[0]!],
    [{relativePath:"PRIVATE_ROOT/PERSON/../clinical.xlsx",size:1}],
    [{relativePath:"PRIVATE_ROOT/PERSON\\secret/clinical.xlsx",size:1}],
    [{relativePath:"PRIVATE_ROOT/PERSON/clinical.xls",size:1}],
    [{relativePath:"PRIVATE_ROOT/PERSON/clinical.xlsx",size:0}],
  ];
  for(const entries of cases){
    const result=reviewHistoricalFolderSelection(entries);
    assert.equal(result.state,"blocked");
    assert.equal(result.photo_candidates.length,0);
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE_|clinical|medical|\.xlsx/);
  }
});
test("file and total budgets and photo folder depth are bounded",()=>{
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:20*1024*1024+1},
  ]).state,"blocked");
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:1},
    {relativePath:"ROOT/A/img.jpg",size:10*1024*1024+1},
  ]).state,"blocked");
  const deep="ROOT/A/"+Array.from({length:9},(_,i)=>"part"+i).join("/")+"/img.png";
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:1},{relativePath:deep,size:1},
  ]).state,"blocked");
  const many=Array.from({length:1201},(_,i)=>({
    relativePath:`ROOT/PERSON/asset${i}.jpg`,size:1,
  }));
  assert.equal(reviewHistoricalFolderSelection(many).state,"blocked");
  const total=Array.from({length:17},(_,i)=>({
    relativePath:`ROOT/PERSON/chart${i}.xlsx`,size:20*1024*1024,
  }));
  assert.equal(reviewHistoricalFolderSelection(total).state,"blocked");
});
test("UI remains an admin-only ephemeral client-side review without network or original storage",()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
  const read=(file:string)=>readFileSync(path.join(root,file),"utf8");
  const page=read("app/admin/importacao-inicial/page.tsx");
  const ui=read("components/admin/HistoricalFolderSelectionReview.tsx");
  assert.match(page,/await requireRole\("admin"\)/);
  assert.match(page,/HistoricalFolderSelectionReview/);
  assert.match(ui,/webkitdirectory/);
  assert.match(ui,/webkitRelativePath/);
  assert.match(ui,/reviewHistoricalFolderSelection/);
  assert.match(ui,/confirm|Confirm/);
  assert.doesNotMatch(ui,/fetch\(|createAdminClient|localStorage|sessionStorage|console\.|indexedDB|navigator\.sendBeacon|\.storage\./);
});
