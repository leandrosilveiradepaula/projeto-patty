import assert from "node:assert/strict";
import test from "node:test";
import { collectAdminDirectoryPages, orderAdminRecords, ADMIN_DIRECTORY_PAGE_SIZE } from "./admin-directory-pagination.ts";

test("reads exact full and subsequent partial pages", async () => {
  const offsets:number[]=[];
  const rows=await collectAdminDirectoryPages(async (from,to)=>{
    offsets.push(from);assert.equal(to-from+1,ADMIN_DIRECTORY_PAGE_SIZE);
    return { data: from===0?Array(ADMIN_DIRECTORY_PAGE_SIZE).fill("first"):["last"],error:null };
  });
  assert.equal(rows.length,501);assert.deepEqual(offsets,[0,500]);
});
test("exact full page triggers terminal read",async()=>{
 const offsets:number[]=[];
 const rows=await collectAdminDirectoryPages(async from=>{offsets.push(from);return {data:from===0?Array(500).fill(1):[],error:null};});
 assert.equal(rows.length,500);assert.deepEqual(offsets,[0,500]);
});
test("empty and failing pages cannot misrepresent administrative metrics",async()=>{
 assert.deepEqual(await collectAdminDirectoryPages(async()=>({data:[],error:null})),[]);
 await assert.rejects(collectAdminDirectoryPages(async from=>from===0?{data:Array(500).fill(1),error:null}:{data:null,error:new Error("query failed")}),/query failed/);
 await assert.rejects(collectAdminDirectoryPages(async()=>({data:null,error:null})),/null rows/);
});
test("global chronological order interprets timezones and invalid historical dates safely",()=>{
 const rows=[{id:"a",time:"2026-10-10T11:00:00-03:00"},{id:"b",time:"2026-10-10T15:00:00Z"},{id:"z",time:"bad-date"}];
 assert.deepEqual(orderAdminRecords(rows,x=>x.time).map(x=>x.id),["b","a","z"]);
});
