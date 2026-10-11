import assert from "node:assert/strict";
import test from "node:test";
import {
  RELEASE_EXPLORER_PAGE_SIZE,
  INITIAL_RELEASE_FILTERS,
  filterReleasedContent, hasActiveReleasedContentFilters,
  normalizedReleasedContentSearch, orderReleasedContent,
  paginateReleasedContent, releasedContentFacetOptions, releasedContentTotals,
  releasePageForExactId,
  type ReleasedContentEntry,
} from "./release-explorer.ts";

const rows: ReleasedContentEntry[] = [
  { id:"b",title:"Guia de exercícios",category:"Movimento",type:"Vídeo",releasedAt:"2026-10-09T09:00:00-03:00",assetCount:1 },
  { id:"a",title:"Alimentação — guia",category:"Nutrição",type:"PDF",releasedAt:"2026-10-09T12:00:00Z",assetCount:2 },
  { id:"c",title:"Como usar balança",category:"Nutrição",type:"Vídeo",releasedAt:"2026-10-01T08:00:00Z",assetCount:0 },
  { id:"d",title:"Materiais antigos",category:"Não informado",type:"Não informado",releasedAt:"legacy",assetCount:0 },
];
const only = (partial:Partial<typeof INITIAL_RELEASE_FILTERS>) =>
  filterReleasedContent(rows, {...INITIAL_RELEASE_FILTERS,...partial}).map((r)=>r.id);

test("search ignores accent, case and whitespace but does not alter stored titles", () => {
  const unchanged = rows.map((x)=>x.title);
  assert.equal(normalizedReleasedContentSearch("  NUTRIÇÃO   Básica  "),"nutricao basica");
  assert.deepEqual(only({query:"  alimentação  "}),["a"]);
  assert.deepEqual(only({query:"VIDEO"}),["b","c"]);
  assert.deepEqual(only({query:"MATERIAL  ANTIGO"}),[]); // no stemming assumptions
  assert.deepEqual(rows.map((x)=>x.title),unchanged);
});

test("category filter uses actual released metadata, never hard-coded taxonomy",()=>{
  assert.deepEqual(only({category:"Nutrição"}),["a","c"]);
  assert.deepEqual(only({category:"Não informado"}),["d"]);
  assert.deepEqual(only({category:"unknown"}),[]);
  assert.deepEqual(releasedContentFacetOptions(rows),{
    categories:["Movimento","Não informado","Nutrição"],types:["Não informado","PDF","Vídeo"],
  });
});

test("type and availability filters compose with title search",()=>{
  assert.deepEqual(only({type:"Vídeo"}),["b","c"]);
  assert.deepEqual(only({availability:"missing"}),["c","d"]);
  assert.deepEqual(only({availability:"available"}),["a","b"]);
  assert.deepEqual(only({category:"Nutrição",type:"Vídeo",availability:"missing"}),["c"]);
  assert.deepEqual(only({category:"Nutrição",type:"PDF",availability:"missing"}),[]);
});

test("newest and oldest compare actual instants and keep invalid legacy dates last",()=>{
  assert.deepEqual(orderReleasedContent(rows,"newest").map(x=>x.id),["a","b","c","d"]);
  assert.deepEqual(orderReleasedContent(rows,"oldest").map(x=>x.id),["c","b","a","d"]);
});

test("title and file-count sorts use stable, factual fields",()=>{
  assert.deepEqual(orderReleasedContent(rows,"title").map(x=>x.id),["a","c","b","d"]);
  assert.deepEqual(orderReleasedContent(rows,"files").map(x=>x.id),["a","b","c","d"]);
  assert.deepEqual(rows.map(x=>x.id),["b","a","c","d"]);
});

test("ties use deterministic opaque ID and don't mutate the original order",()=>{
  const clone=[{...rows[0],id:"z"},{...rows[0],id:"a"}];
  assert.deepEqual(orderReleasedContent(clone,"newest").map(x=>x.id),["a","z"]);
  assert.equal(clone[0].id,"z");
});

test("summary differentiates full history from displayed subset and missing assets",()=>{
  assert.deepEqual(releasedContentTotals(rows),{all:4,available:2,missing:2});
  assert.deepEqual(releasedContentTotals([]),{all:0,available:0,missing:0});
});

test("pagination handles empty, single, exact page boundaries, large pages and tail",()=>{
  const source=Array.from({length:RELEASE_EXPLORER_PAGE_SIZE*2+1},(_,i)=>i);
  const first=paginateReleasedContent(source,1);
  const second=paginateReleasedContent(source,2);
  const last=paginateReleasedContent(source,3);
  assert.deepEqual([first.first,first.last,first.total,first.pages],[1,12,25,3]);
  assert.deepEqual([second.first,second.last,second.previous,second.next],[13,24,1,3]);
  assert.deepEqual([last.first,last.last,last.previous,last.next],[25,25,2,null]);
  assert.deepEqual(last.items,[24]);
  assert.deepEqual(paginateReleasedContent(source,99).items,[24]);
  assert.deepEqual(paginateReleasedContent([],4),{items:[],page:1,pages:1,total:0,first:0,last:0,previous:null,next:null});
  assert.deepEqual(source,Array.from({length:25},(_,i)=>i));
});

test("invalid page requests safely fall back to the initial view",()=>{
  for (const value of [0, -1, NaN, 1.5, Number.POSITIVE_INFINITY]) {
    assert.equal(paginateReleasedContent(rows,value).page,1);
  }
});

test("hash-target lookup reaches a version outside the first page, without revealing hidden IDs",()=>{
  const many=Array.from({length:25},(_,i)=>({
    id:String(i),title:"Material",category:"Geral",type:"PDF",
    releasedAt:new Date(Date.UTC(2026,0,i+1)).toISOString(),assetCount:1,
  }));
  assert.equal(releasePageForExactId(many,"0"),3);
  assert.equal(releasePageForExactId(many,"24"),1);
  assert.equal(releasePageForExactId(many,"not-authorized"),null);
});

test("query and facets are purely in browser state, not a search endpoint",()=>{
  assert.equal(hasActiveReleasedContentFilters(INITIAL_RELEASE_FILTERS),false);
  assert.equal(hasActiveReleasedContentFilters({...INITIAL_RELEASE_FILTERS,order:"title"}),true);
  assert.equal(hasActiveReleasedContentFilters({...INITIAL_RELEASE_FILTERS,query:"  "}),false);
  assert.equal(hasActiveReleasedContentFilters({...INITIAL_RELEASE_FILTERS,query:"guia"}),true);
});
