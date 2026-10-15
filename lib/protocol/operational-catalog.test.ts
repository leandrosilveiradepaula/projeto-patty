import assert from "node:assert/strict";
import test from "node:test";
import {
 buildProtocolOperationalSummaries, readOperationalProtocolFilters,
 exploreOperationalProtocolCatalog, operationalProtocolCatalogHref,
 operationalProtocolVersionHref, protocolOperationalStatusLabel,
 protocolPublicationDate,readProtocolCatalogPage,protocolNextActionLabel,
} from "./operational-catalog.ts";

const protocols=[
 {id:"a",created_at:"2026-10-04T10:00:00Z",protocol_type:"nutrition"},
 {id:"b",created_at:"2026-10-05T10:00:00Z",protocol_type:"nutrition"},
 {id:"c",created_at:"2026-10-06T10:00:00Z",protocol_type:"nutrition"},
 {id:"d",created_at:"2026-10-07T10:00:00Z",protocol_type:"nutrition"},
 {id:"e",created_at:"2026-10-08T10:00:00Z",protocol_type:"nutrition"},
 {id:"f",created_at:"2026-10-09T10:00:00Z",protocol_type:"legacy"},
];
const versions=[
 {id:"a1",protocol_id:"a",version_number:1,created_at:"2026-10-04T10:00:00Z",submitted_for_review_at:null},
 {id:"b1",protocol_id:"b",version_number:1,created_at:"2026-10-05T10:00:00Z",submitted_for_review_at:"2026-10-05T14:00:00Z"},
 {id:"c1",protocol_id:"c",version_number:1,created_at:"2026-10-06T10:00:00Z",submitted_for_review_at:"2026-10-06T14:00:00Z"},
 {id:"d1",protocol_id:"d",version_number:1,created_at:"2026-10-07T10:00:00Z",submitted_for_review_at:"2026-10-07T14:00:00Z"},
 {id:"e1",protocol_id:"e",version_number:1,created_at:"2026-10-08T10:00:00Z",submitted_for_review_at:"2026-10-08T14:00:00Z"},
 {id:"e2",protocol_id:"e",version_number:2,created_at:"2026-10-09T10:00:00Z",submitted_for_review_at:null},
 {id:"private",protocol_id:"private-parent",version_number:999,created_at:"2026-10-10T10:00:00Z",submitted_for_review_at:null},
];
const approvals=[
 {protocol_version_id:"c1",approved_at:"2026-10-06T16:00:00Z"},
 {protocol_version_id:"d1",approved_at:"2026-10-07T16:00:00Z"},
 {protocol_version_id:"e1",approved_at:"2026-10-08T16:00:00Z"},
 {protocol_version_id:"private",approved_at:"2026-10-10T16:00:00Z"},
];
const publications=[
 {id:"pub-d",protocol_version_id:"d1",published_at:"2026-10-07T20:00:00+02:00"},
 {id:"pub-e",protocol_version_id:"e1",published_at:"2026-10-09T15:00:00-03:00"},
 {id:"pub-private",protocol_version_id:"private",published_at:"2026-10-10T10:00:00Z"},
];
const summaries=buildProtocolOperationalSummaries(protocols.map(x=>x.id),versions,approvals,publications);
function explore(raw:Record<string,unknown>={}){
 return exploreOperationalProtocolCatalog(protocols,summaries,readOperationalProtocolFilters(raw),row=>row.id);
}
test("lifecycle is a sequence of independent real events, not inferred publication",()=>{
 assert.equal(summaries.get("f")?.latestStatus,"missing-version");
 assert.equal(summaries.get("a")?.latestStatus,"draft");
 assert.equal(summaries.get("b")?.latestStatus,"under-review");
 assert.equal(summaries.get("c")?.latestStatus,"approved");
 assert.equal(summaries.get("d")?.latestStatus,"published");
 assert.equal(summaries.get("e")?.latestStatus,"draft");
 assert.equal(summaries.get("e")?.hasUnpublishedNewerVersion,true);
 assert.equal(summaries.get("e")?.lastPublishedVersion?.id,"e1");
 assert.equal(summaries.get("e")?.latestVersion?.id,"e2");
 assert.equal(summaries.get("f")?.publicationCount,0);
});
test("ignore child versions, approvals and publications not belonging to authorized parents",()=>{
 assert.equal(summaries.has("private-parent"),false);
 assert.equal(summaries.get("d")?.latestVersion?.version_number,1);
 assert.equal(summaries.get("d")?.publicationCount,1);
});
test("published event timestamps compare real instants across offsets, never lexical order",()=>{
 const fake=buildProtocolOperationalSummaries(["p"],[
  {id:"p1",protocol_id:"p",version_number:1,created_at:"2026-10-01T00:00:00Z",submitted_for_review_at:null},
  {id:"p2",protocol_id:"p",version_number:2,created_at:"2026-10-02T00:00:00Z",submitted_for_review_at:null},
 ],[],[
  {id:"earlier",protocol_version_id:"p2",published_at:"2026-10-10T20:30:00+02:00"},
  {id:"later",protocol_version_id:"p1",published_at:"2026-10-10T17:00:00-03:00"},
 ]);
 assert.equal(fake.get("p")?.lastPublishedVersion?.id,"p1");
 assert.equal(fake.get("p")?.lastPublishedAt,"2026-10-10T17:00:00-03:00");
});
test("duplicate publication IDs and unowned version rows cannot create phantom counts",()=>{
 const events=[...publications,publications[0],{id:"bogus",protocol_version_id:"alien",published_at:"2026-10-09T20:00:00Z"}];
 const x=buildProtocolOperationalSummaries(["d"],versions,approvals,events);
 assert.equal(x.get("d")?.publicationCount,1);
});
test("filters distinguish lifecycle, publication and newer draft",()=>{
 const statuses:{raw:string;ids:string[]}[]=[
  {raw:"needs-recovery",ids:["f"]},
  {raw:"latest-draft",ids:["a","e"]},
  {raw:"under-review",ids:["b"]},
  {raw:"awaiting-publication",ids:["c"]},
  {raw:"latest-published",ids:["d"]},
  {raw:"published-with-newer-version",ids:["e"]},
  {raw:"never-published",ids:["a","b","c","f"]},
  {raw:"with-version",ids:["a","b","c","d","e"]},
 ];
 for(const row of statuses)assert.deepEqual(explore({status:row.raw}).items.map(x=>x.id).sort(),row.ids.sort());
});
test("status counts refer to whole accessible catalog rather than filtered subset",()=>{
 const x=explore({status:"latest-published"});
 assert.equal(x.total,1);
 assert.deepEqual(x.counts,{
  total:6,needsRecovery:1,latestDraft:2,underReview:1,
  awaitingPublication:1,latestPublished:1,newerUnpublished:1,
 });
});
test("type filters only reflect registered type and do not infer a new protocol family",()=>{
 assert.deepEqual(explore({tipo:"other"}).items.map(x=>x.id),["f"]);
 assert.equal(explore({tipo:"nutrition"}).total,5);
 assert.equal(readOperationalProtocolFilters({tipo:"unknown"}).type,"all");
});
test("robust pagination bounds malformed query inputs and never loses a result",()=>{
 for(const input of [["2"],null,"0","-1","01","1e4","10000","",100,{}]){
  assert.equal(readProtocolCatalogPage(input).invalid,true);
 }
 const many=Array.from({length:33},(_,i)=>({
  id:"p"+String(i).padStart(3,"0"),created_at:"2026-10-11T10:00:00Z",protocol_type:"nutrition",
 }));
 const summary=buildProtocolOperationalSummaries(many.map(x=>x.id),[],[],[]);
 const filt=readOperationalProtocolFilters({pagina:"2"});
 const x=exploreOperationalProtocolCatalog(many,summary,filt,row=>row.id);
 assert.deepEqual([x.page,x.pages,x.from,x.to,x.items.length],[2,3,16,30,15]);
 assert.equal(exploreOperationalProtocolCatalog(many,summary,{...filt,page:999},row=>row.id).invalidPage,true);
});
test("sort newest, oldest and publication with absent dates deterministic",()=>{
 assert.deepEqual(explore({ordem:"newest"}).items.map(x=>x.id),["f","e","d","c","b","a"]);
 assert.deepEqual(explore({ordem:"oldest"}).items.map(x=>x.id),["a","b","c","d","e","f"]);
 assert.deepEqual(explore({ordem:"recent-publication"}).items.slice(0,2).map(x=>x.id),["e","d"]);
 assert.deepEqual(explore({ordem:"latest-version"}).items[0].id,"e");
});
test("URL state retains filters but cannot append client names or raw health observations",()=>{
 const filters=readOperationalProtocolFilters({
  q:"  Érica  ",status:"awaiting-publication",ordem:"recent-publication",tipo:"nutrition",
 });
 const href=operationalProtocolCatalogHref("/admin/protocolos",filters,2);
 assert.match(href,/status=awaiting-publication/);
 assert.match(href,/pagina=2/);
 assert.match(href,/#protocolos-lista$/);
 assert.equal(href.includes("observacao"),false);
 assert.equal(readOperationalProtocolFilters({q:["sensitive"]}).query,"");
});
test("exact version navigation cannot fabricate a version if no RLS-visible row",()=>{
 assert.equal(operationalProtocolVersionHref("p",null),null);
 assert.equal(operationalProtocolVersionHref("p",versions[0]),"/admin/protocolos/p?versao=1#versao-1");
 assert.equal(protocolOperationalStatusLabel("approved"),"Aprovado, ainda não publicado");
 assert.equal(protocolPublicationDate("bad"),"Data indisponível");
});

test("professional protocol action labels preserve exact manual lifecycle stages",()=>{
 assert.equal(protocolNextActionLabel("draft",2),"Continuar rascunho · versão 2");
 assert.equal(protocolNextActionLabel("under-review",2),"Revisar versão 2");
 assert.equal(protocolNextActionLabel("approved",2),"Publicar versão 2");
 assert.equal(protocolNextActionLabel("published",2),"Consultar versão 2 publicada");
 assert.equal(protocolNextActionLabel("missing-version",2),"Recuperar versão inicial");
});
