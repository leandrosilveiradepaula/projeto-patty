import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTrainingRequestFilters, trainingRequestFactualOrigin, exploreTrainingRequests,
  trainingRequestFilteredHref, trainingRequestExactHref, trainingVersionExactHref,
  trainingVersionPageHref, paginateTrainingVersions, selectPublishedTrainingComparison, trainingVersionComparisonHref, clientTrainingRequestExactHref, parseTrainingVersionFilters, exploreTrainingVersionHistory, parseClientTrainingArchiveFilters, exploreClientTrainingArchive, trainingAdminVersionHref, trainingClientArchivedVersionHref, trainingClientArchiveHref,
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

test("direct historical client request navigation accounts for featured latest request",()=>{
 const list=Array.from({length:25},(_,i)=>({id:"id"+i,requested_at:new Date(Date.UTC(2026,9,25-i)).toISOString(),recorded_by_profile_id:"client",note:null}));
 assert.equal(clientTrainingRequestExactHref("/cliente/treino",list,"id0"),"/cliente/treino#pedido-treino-id0");
 assert.equal(clientTrainingRequestExactHref("/cliente/treino",list,"id11"),"/cliente/treino?pedidos=2#pedido-treino-id11");
 assert.equal(clientTrainingRequestExactHref("/cliente/treino",list,"missing"),null);
});
test("comparison links refuse draft/unknown versions and retain exact published ID",()=>{
 const versions=[{id:"v1",published_at:"2026-10-09T10:00:00Z"},{id:"v2",published_at:"2026-10-10T10:00:00Z"},{id:"draft",published_at:null}];
 assert.equal(trainingVersionComparisonHref("/cliente/treino",versions,"draft"),null);
 assert.equal(trainingVersionComparisonHref("/cliente/treino",versions,"missing"),null);
 assert.equal(trainingVersionComparisonHref("/cliente/treino",versions,"v1"),"/cliente/treino?comparar=v1#comparar-publicacoes-treino");
});

test("professional version archive filters published, reviewed, and draft without reclassifying",()=>{
 const rows=[{id:"a",title:"Revisão inicial",version_number:1,reviewed_at:null,published_at:null},{id:"b",title:"Treino completo",version_number:2,reviewed_at:"2026-10-01T10:00:00Z",published_at:null},{id:"c",title:"Treino final",version_number:3,reviewed_at:"2026-10-01T10:00:00Z",published_at:"2026-10-02T10:00:00Z"}];
 assert.equal(exploreTrainingVersionHistory(rows,parseTrainingVersionFilters({estadoVersao:"draft"})).items[0].id,"a");
 assert.equal(exploreTrainingVersionHistory(rows,parseTrainingVersionFilters({estadoVersao:"reviewed"})).items[0].id,"b");
 assert.equal(exploreTrainingVersionHistory(rows,parseTrainingVersionFilters({estadoVersao:"published"})).items[0].id,"c");
 assert.deepEqual(exploreTrainingVersionHistory(rows,parseTrainingVersionFilters({ordemVersao:"number-asc"})).items.map(x=>x.id),["a","b","c"]);
 assert.equal(exploreTrainingVersionHistory(rows,parseTrainingVersionFilters({buscaVersao:"revisao"})).total,1);
});
test("client archive excludes unpublished, supports oldest and page navigation",()=>{
 const rows=Array.from({length:14},(_,i)=>({version:{id:String(i),title:"Treino "+i,version_number:15-i,published_at:i===13?null:new Date(Date.UTC(2026,9,15-i)).toISOString()}}));
 const result=exploreClientTrainingArchive(rows,parseClientTrainingArchiveFilters({versoes:"2"}));
 assert.equal(result.total,13);assert.equal(result.page,2);assert.equal(result.items.length,6);
 assert.equal(exploreClientTrainingArchive(rows,parseClientTrainingArchiveFilters({ordemTreino:"oldest"})).items[0].version.id,"12");
 assert.equal(exploreClientTrainingArchive(rows,parseClientTrainingArchiveFilters({buscaTreino:"treino 3"})).total,1);
});

test("professional version links target the exact archive page even after filtering",()=>{
 const versions=Array.from({length:15},(_,i)=>({id:"v"+i,title:"Treino "+i,version_number:i+1,published_at:i%2?"2026-10-11T00:00:00Z":null,reviewed_at:null}));
 const href=trainingAdminVersionHref("/admin/clientes/synthetic/treino",versions,"v13");
 assert.equal(href,"/admin/clientes/synthetic/treino?versoes=3#versao-treino-v13");
 assert.equal(trainingAdminVersionHref("/admin/clientes/synthetic/treino",versions,"not-authorized"),null);
});
test("client archive links reach the correct page without exposing drafts",()=>{
 const previous=Array.from({length:15},(_,i)=>({version:{id:"p"+i,title:"Treino "+i,version_number:15-i,published_at:"2026-10-11T00:00:00Z"}}));
 assert.equal(trainingClientArchivedVersionHref("/cliente/treino",previous,"p13"),"/cliente/treino?versoes=3#treino-versao-p13");
 assert.equal(trainingClientArchivedVersionHref("/cliente/treino",previous,"missing"),null);
});

test("request navigation preserves the independent archive controls",()=>{
 const f=parseTrainingRequestFilters({origem:"client"});
 const professional=parseTrainingVersionFilters({buscaVersao:"Completo",estadoVersao:"published",ordemVersao:"title"});
 const client=parseClientTrainingArchiveFilters({buscaTreino:"Treino",ordemTreino:"oldest"});
 const admin=trainingRequestFilteredHref("/admin/test/treino",f,2,"historico-solicitacoes-treino",3,{professional});
 assert.match(admin,/buscaVersao=Completo/);assert.match(admin,/estadoVersao=published/);assert.match(admin,/versoes=3/);
 const user=trainingRequestFilteredHref("/cliente/treino",f,2,"solicitacoes-anteriores",2,{client,comparisonId:"published-id"});
 assert.match(user,/buscaTreino=Treino/);assert.match(user,/ordemTreino=oldest/);assert.match(user,/comparar=published-id/);
});
test("archive page change retains request filter state and verified comparison",()=>{
 const link=trainingClientArchiveHref("/cliente/treino",parseClientTrainingArchiveFilters({buscaTreino:"a"}),3,parseTrainingRequestFilters({origem:"professional",pedidos:"2"}),"publication");
 assert.match(link,/origem=professional/);assert.match(link,/pedidos=2/);assert.match(link,/versoes=3/);assert.match(link,/comparar=publication/);
});
