import assert from "node:assert/strict";
import test from "node:test";
import { collectProtocolCatalogPages } from "./catalog-pagination.ts";
import { PUBLISHED_PROTOCOL_PAGE_SIZE } from "./published-read-pagination.ts";

test("catalog includes exact-full and final partial pages", async () => {
  const offsets:number[]=[];
  const rows=await collectProtocolCatalogPages(async (from,to)=>{
    offsets.push(from);
    assert.equal(to-from+1,PUBLISHED_PROTOCOL_PAGE_SIZE);
    return {data:from===0?Array(PUBLISHED_PROTOCOL_PAGE_SIZE).fill("older"):["tail"],error:null};
  });
  assert.equal(rows.length,PUBLISHED_PROTOCOL_PAGE_SIZE+1);
  assert.deepEqual(offsets,[0,500]);
});
test("exact full catalog requires an empty last fetch",async()=>{
 const offsets:number[]=[];
 const rows=await collectProtocolCatalogPages(async from=>{
   offsets.push(from);
   return {data:from===0?Array(PUBLISHED_PROTOCOL_PAGE_SIZE).fill(1):[],error:null};
 });
 assert.equal(rows.length,PUBLISHED_PROTOCOL_PAGE_SIZE);
 assert.deepEqual(offsets,[0,500]);
});
test("catalog fails closed after partial success and on null rows",async()=>{
 await assert.rejects(collectProtocolCatalogPages(async from=>from===0?
 {data:Array(PUBLISHED_PROTOCOL_PAGE_SIZE).fill("first"),error:null}:
 {data:null,error:new Error("access denied")}),/access denied/);
 await assert.rejects(collectProtocolCatalogPages(async()=>({data:null,error:null})),/null rows/);
});
test("empty catalog is an empty history",async()=>{
 assert.deepEqual(await collectProtocolCatalogPages(async()=>({data:[],error:null})),[]);
});
