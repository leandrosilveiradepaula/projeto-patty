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
    assert.ok(result.state==="blocked"||result.state==="review_with_issues");
    if(result.state==="review_with_issues")assert.ok(result.errors.length>0);
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE_|clinical|medical|\.xlsx/);
  }
});
test("oversize, unusual depth and many files are explicit inventory issues",()=>{
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:20*1024*1024+1},
  ]).state,"review_with_issues");
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:1},
    {relativePath:"ROOT/A/img.jpg",size:10*1024*1024+1},
  ]).state,"review_with_issues");
  const deep="ROOT/A/"+Array.from({length:9},(_,i)=>"part"+i).join("/")+"/img.png";
  assert.equal(reviewHistoricalFolderSelection([
    {relativePath:"ROOT/A/one.xlsx",size:1},{relativePath:deep,size:1},
  ]).state,"review_with_issues");
  const many=Array.from({length:1201},(_,i)=>({
    relativePath:`ROOT/PERSON/asset${i}.jpg`,size:1,
  }));
  assert.equal(reviewHistoricalFolderSelection(many).state,"review_with_issues");
  const total=Array.from({length:17},(_,i)=>({
    relativePath:`ROOT/PERSON/chart${i}.xlsx`,size:20*1024*1024,
  }));
  assert.equal(reviewHistoricalFolderSelection(total).state,"review_with_issues");
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


test("real-scale selection of 6453 files does not require splitting into batches for preview",()=>{
  const entries=[
    {relativePath:"ROOT/CLIENT_001/excel.xlsx",size:1500},
    ...Array.from({length:6452},(_,i)=>({
      relativePath:`ROOT/CLIENT_001/2022-06-18/evolucao${i}.jpg`,size:5500000,
    })),
  ];
  const result=reviewHistoricalFolderSelection(entries);
  assert.equal(result.state,"ready_for_local_review");
  assert.equal(result.files,6453);
  assert.equal(result.excels,1);
  assert.equal(result.photos,6452);
  assert.equal(result.folders[0]?.photo_count,6452);
  assert.equal(result.photo_candidates.length,60);
  assert.equal(result.photo_candidates_truncated,true);
  assert.ok(result.bytes>300*1024*1024);
  assert.doesNotMatch(JSON.stringify(result),/CLIENT_001|evolucao|ROOT/);
});
test("unexpected archive formats remain counted as explicit pending items, never imported silently",()=>{
  const result=reviewHistoricalFolderSelection([
    {relativePath:"ROOT/CLIENT_HISTORY/table.xlsx",size:100},
    {relativePath:"ROOT/CLIENT_HISTORY/2022/photo.jpg",size:500},
    {relativePath:"ROOT/CLIENT_HISTORY/scanned.pdf",size:200},
    {relativePath:"ROOT/CLIENT_HISTORY/old.xls",size:200},
  ]);
  assert.equal(result.state,"review_with_issues");
  assert.equal(result.files,4);
  assert.equal(result.excels,1);
  assert.equal(result.photos,1);
  assert.equal(result.unsupported_count,2);
  assert.equal(result.errors[0],"unsupported_files_present");
  assert.doesNotMatch(JSON.stringify(result),/CLIENT_HISTORY|scanned|\.pdf/);
});


test("selecting ONE existing client folder directly requires no copying or parent folder",()=>{
  const selected=[
    {relativePath:"PRIVATE_CLIENT_A/history.xlsx",size:2048},
    {relativePath:"PRIVATE_CLIENT_A/front.jpg",size:3000},
    {relativePath:"PRIVATE_CLIENT_A/15.08.2023/side.png",size:3001},
    {relativePath:"PRIVATE_CLIENT_A/2024-09-16/back.jpeg",size:3002},
  ];
  const result=reviewHistoricalFolderSelection(selected);
  assert.equal(result.state,"ready_for_local_review");
  assert.equal(result.files,4);
  assert.equal(result.excels,1);
  assert.equal(result.photos,3);
  assert.deepEqual(result.folders,[{
    folder_index:1,excel_count:1,photo_count:3,proposed_date_count:2,
  }]);
  assert.deepEqual(result.photo_candidates.map(p=>p.proposed_date),
    [null,"2023-08-15","2024-09-16"]);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_CLIENT_A|history|front|side|back/);
});
test("single client folder can show incomplete Excel or unsupported types as unresolved",()=>{
  const result=reviewHistoricalFolderSelection([
    {relativePath:"PRIVATE_CLIENT/initial.jpg",size:3000},
    {relativePath:"PRIVATE_CLIENT/2022-09-14/photo.jpg",size:3000},
    {relativePath:"PRIVATE_CLIENT/notes.pdf",size:100},
  ]);
  assert.equal(result.state,"review_with_issues");
  assert.equal(result.files,3);
  assert.equal(result.photos,2);
  assert.equal(result.excels,0);
  assert.equal(result.unsupported_count,1);
  assert.equal(result.client_structure_issues,1);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_CLIENT|notes\\.pdf|2022-09-14\\/photo\\.jpg/);
});
test("mixed root-level client files and deeper client spreadsheets do not masquerade as one client",()=>{
  const result=reviewHistoricalFolderSelection([
    {relativePath:"PRIVATE_ROOT/loose.xlsx",size:4000},
    {relativePath:"PRIVATE_ROOT/CLIENT_B/historical.xlsx",size:4000},
  ]);
  assert.equal(result.state,"blocked");
  assert.deepEqual(result.errors,["ambiguous_mixed_folder_layout"]);
  assert.equal(result.folders.length,0);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_ROOT|CLIENT_B|loose/);
});
test("single-client direct select and full archive select both preserve pure metadata boundaries",()=>{
  const direct=reviewHistoricalFolderSelection([
    {relativePath:"PRIVATE_CLIENT/history.xlsx",size:100},
    {relativePath:"PRIVATE_CLIENT/evolution/2023-01-05/img.jpg",size:200},
  ]);
  const full=reviewHistoricalFolderSelection([
    {relativePath:"PRIVATE_ROOT/PRIVATE_CLIENT/history.xlsx",size:100},
    {relativePath:"PRIVATE_ROOT/PRIVATE_CLIENT/evolution/2023-01-05/img.jpg",size:200},
  ]);
  assert.equal(direct.state,"ready_for_local_review");
  assert.equal(full.state,"ready_for_local_review");
  assert.deepEqual(direct.folders,full.folders);
  assert.deepEqual(direct.photo_candidates,full.photo_candidates);
  assert.equal(direct.bytes,full.bytes);
  assert.equal(direct.photos,full.photos);
});
