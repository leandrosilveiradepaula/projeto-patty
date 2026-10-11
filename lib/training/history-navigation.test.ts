import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTrainingRequestFilters, trainingRequestFactualOrigin, exploreTrainingRequests,
  trainingRequestFilteredHref, trainingRequestExactHref, trainingVersionExactHref,
  trainingVersionPageHref, paginateTrainingVersions, selectPublishedTrainingComparison,
} from "./history-navigation.ts";

const rows = [
  {id:"a",requested_at:"2026-10-09T12:00:00Z",recorded_by_profile_id:"client",note:"nota sintética"},
  {id:"b",requested_at:"2026-10-10T11:00:00-03:00",recorded_by_profile_id:"admin",note:null},
  {id:"c",requested_at:"2026-10-11T13:00:00Z",recorded_by_profile_id:null,note:""},
];
test("origin is factual; missing client identity and author remain unclassified",()=>{
  assert.equal(trainingRequestFactualOrigin("client","client"),"client");
  assert.equal(trainingRequestFactualOrigin("admin","client"),"professional");
  assert.equal(trainingRequestFactualOrigin("admin",null),"unknown");
  assert.equal(trainingRequestFactualOrigin(null,"client"),"unknown");
});
test("query options are strictly enumerated and do not serialize observations",()=>{
 const f=parseTrainingRequestFilters({origem:"invalid",periodo:"then",observacao:"notes;foo",ordem:"up",pedidos:["2"]});
 assert.deepEqual(f,{origin:"all",notes:"all",period:"all",order:"newest",page:undefined});
 const link=trainingRequestFilteredHref("/cliente/treino",parseTrainingRequestFilters({origem:"client",observacao:"with-note",periodo:"after-publication",ordem:"oldest"}),3,"solicitacoes-anteriores");
 assert.match(link,/origem=client/);assert.match(link,/pedidos=3/);assert.match(link,/#solicitacoes-anteriores$/);
 assert.ok(!link.includes("sintética"));
});
test("origin, observation and publication moment filters apply before pagination",()=>{
 const one=exploreTrainingRequests(rows,parseTrainingRequestFilters({origem:"professional"}),"client",null);
 assert.deepEqual(one.items.map(x=>x.id),["b"]);
 const two=exploreTrainingRequests(rows,parseTrainingRequestFilters({observacao:"without-note"}),"client",null);
 assert.deepEqual(two.items.map(x=>x.id),["c","b"]);
 const three=exploreTrainingRequests(rows,parseTrainingRequestFilters({periodo:"after-publication"}),"client","2026-10-10T12:00:00Z");
 assert.deepEqual(three.items.map(x=>x.id),["c","b"]);
 const four=exploreTrainingRequests(rows,parseTrainingRequestFilters({periodo:"before-or-at-publication"}),"client","2026-10-10T12:00:00Z");
 assert.deepEqual(four.items.map(x=>x.id),["a"]);
 assert.equal(exploreTrainingRequests(rows,parseTrainingRequestFilters({periodo:"after-publication"}),"client",null).total,0);
});
test("oldest uses actual instants; invalid timestamps always last",()=>{
 const xs=[...rows,{id:"invalid",requested_at:"not-a-date",recorded_by_profile_id:"client",note:null}];
 assert.deepEqual(exploreTrainingRequests(xs,parseTrainingRequestFilters({ordem:"oldest"}),"client",null).items.map(x=>x.id),["a","b","c","invalid"]);
});
test("latest request remains separately visible on client history",()=>{
 const result=exploreTrainingRequests(rows,parseTrainingRequestFilters({}),"client",null,true);
 assert.equal(result.unfiltered,2);
 assert.deepEqual(result.items.map(x=>x.id),["b","a"]);
});
test("page for an exact authorized request clears hiding filters and is not invented",()=>{
 const many=Array.from({length:23},(_,i)=>({id:String(i),requested_at:new Date(Date.UTC(2026,9,31-i)).toISOString(),recorded_by_profile_id:"client",note:null}));
 const href=trainingRequestExactHref("/admin/clientes/id/treino",many,"18");
 assert.ok(href?.includes("pedidos=2"));assert.ok(href?.endsWith("#pedido-treino-18"));
 assert.equal(trainingRequestExactHref("/admin/treino",many,"not-authorized"),null);
});
test("version pagination and explicit links resolve only authorized versions",()=>{
 const versions=Array.from({length:15},(_,i)=>({id:"v"+i}));
 const page=paginateTrainingVersions(versions,"3");
 assert.deepEqual(page.items.map(x=>x.id),["v12","v13","v14"]);
 assert.equal(trainingVersionExactHref("/cliente/treino",versions,"v13"),"/cliente/treino?versoes=3#treino-versao-v13");
 assert.equal(trainingVersionExactHref("/cliente/treino",versions,"unknown"),null);
 assert.equal(trainingVersionPageHref("/cliente/treino",2),"/cliente/treino?versoes=2#historico-versoes-treino");
});
test("published comparison selects exact version and its chronological predecessor",()=>{
 const input=[
  {id:"old",published_at:"2026-10-10T11:00:00Z"},
  {id:"new",published_at:"2026-10-11T14:00:00Z"},
  {id:"draft",published_at:null},
 ];
 const res=selectPublishedTrainingComparison(input,"new");
 assert.deepEqual([res.selected?.id,res.previous?.id,res.invalid],["new","old",false]);
 assert.deepEqual([selectPublishedTrainingComparison(input,"old").previous,selectPublishedTrainingComparison(input,"missing").invalid],[null,true]);
 assert.equal(selectPublishedTrainingComparison([{id:"draft",published_at:null}],"draft").selected,null);
});
