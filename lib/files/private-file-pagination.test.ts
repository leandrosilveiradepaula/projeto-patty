import assert from "node:assert/strict";
import test from "node:test";
import { collectPrivateFilePages, orderPrivateFileHistory, PRIVATE_FILE_PAGE_SIZE } from "./private-file-pagination.ts";

test("all private file history pages are included", async () => {
 const calls: number[] = [];
 const rows=await collectPrivateFilePages(async(from,to)=>{
   calls.push(from); assert.equal(to-from+1,PRIVATE_FILE_PAGE_SIZE);
   return { data: from===0 ? Array(PRIVATE_FILE_PAGE_SIZE).fill("previous") : ["last"], error:null };
 });
 assert.equal(rows.length,501); assert.deepEqual(calls,[0,500]);
});
test("an exactly full result requests the next page",async()=>{
 const calls:number[]=[];
 const rows=await collectPrivateFilePages(async from=>{
   calls.push(from); return {data:from===0?Array(PRIVATE_FILE_PAGE_SIZE).fill(1):[],error:null};
 });
 assert.equal(rows.length,PRIVATE_FILE_PAGE_SIZE);assert.deepEqual(calls,[0,500]);
});
test("empty results do not become errors",async()=>{
 assert.deepEqual(await collectPrivateFilePages(async()=>({data:[],error:null})),[]);
});
test("errors after earlier successful pages never return partial private history",async()=>{
 await assert.rejects(collectPrivateFilePages(async from=>from===0?
 {data:Array(PRIVATE_FILE_PAGE_SIZE).fill("before"),error:null}:
 {data:null,error:new Error("access failure")}),/access failure/);
 await assert.rejects(collectPrivateFilePages(async()=>({data:null,error:null})),/null rows/);
});
test("global private-file order uses actual UTC instants and safe invalid date fallback",()=>{
 const rows=[
 {id:"a",created_at:"2026-10-10T12:00:00-03:00"},
 {id:"b",created_at:"2026-10-10T16:00:00Z"},
 {id:"c",created_at:"2026-10-10T16:00:00+00:00"},
 {id:"z",created_at:"bad-date"}
 ];
 assert.deepEqual(orderPrivateFileHistory(rows).map(x=>x.id),["b","c","a","z"]);
});
