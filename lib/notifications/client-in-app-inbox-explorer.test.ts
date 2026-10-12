import assert from "node:assert/strict";
import test from "node:test";
import { readClientNoticeQuery, exploreClientNotices, clientNoticesHref } from "./client-in-app-inbox-explorer.ts";
const list=Array.from({length:30},(_,i)=>({id:i,status:i%2?"pending" as const:"responded" as const}));
test("client notices remain immutable and filter factually by response status",()=>{
 const filtered=exploreClientNotices(list,{status:"pending",page:1});
 assert.equal(filtered.total,15);
 assert.ok(filtered.items.every(x=>x.status==="pending"));
 assert.equal(list.length,30);
});
test("pagination is bounded and query rejects repeated or invalid keys",()=>{
 const q=readClientNoticeQuery({situacao:"responded",pagina:"2"});
 assert.equal(q.invalid,false);
 assert.equal(clientNoticesHref(q.status,q.page),"/cliente/avisos?situacao=responded&pagina=2");
 const bad=readClientNoticeQuery({situacao:["pending"],pagina:"02"});
 assert.equal(bad.invalid,true);
 assert.deepEqual([bad.status,bad.page],["all",1]);
 const second=exploreClientNotices(list,{status:"all",page:999});
 assert.deepEqual([second.page,second.pageCount,second.items.length],[3,3,6]);
});
