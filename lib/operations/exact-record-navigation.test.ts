import assert from "node:assert/strict";
import test from "node:test";
import { authorizedExactRecordPage } from "./exact-record-navigation.ts";
test("exact record resolves only from an authorized list",()=>{
 const rows=Array.from({length:31},(_,i)=>({id:"synthetic-"+i}));
 assert.equal(authorizedExactRecordPage(rows,"synthetic-23",10),3);
 assert.equal(authorizedExactRecordPage(rows,"other-client",10),null);
 assert.equal(authorizedExactRecordPage(rows,["synthetic-2"],10),null);
 assert.equal(authorizedExactRecordPage(rows,"synthetic-0",0),null);
 assert.equal(rows.length,31);
});
