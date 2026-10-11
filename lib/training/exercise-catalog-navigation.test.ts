
import assert from "node:assert/strict";
import test from "node:test";
import {
  sortExerciseCatalog, readExerciseCatalogSort, readExerciseCatalogPage,
  paginateExerciseCatalog, exerciseCatalogHref, catalogVisiblePageNumbers,
} from "./exercise-admin-directory.ts";

const row=(id:string,name:string,created_at:string,published_at:string|null,version_number:number)=>{
  const latestVersion={exercise_id:id,id:id+"v",name,created_at,published_at,version_number};
  return {latestVersion, latestPublishedVersion:published_at?latestVersion:null};
};
const data=[
  row("c","Zíper","2026-10-07T12:00:00Z",null,3),
  row("a","Água","2026-10-09T12:00:00Z","2026-10-09T13:00:00Z",2),
  row("b","Bíceps","malformed","2026-10-10T09:00:00Z",1),
  row("d","Cadeira","2026-10-08T12:00:00Z","invalid",5),
];

test("selects valid ordering and bounds page request",()=>{
  assert.equal(readExerciseCatalogSort(["name-asc"]), "recent");
  assert.equal(readExerciseCatalogSort("name-desc"), "name-desc");
  assert.deepEqual(readExerciseCatalogPage("0001"),{page:1,invalid:true});
  assert.deepEqual(readExerciseCatalogPage("-1"),{page:1,invalid:true});
  assert.deepEqual(readExerciseCatalogPage("3"),{page:3,invalid:false});
  assert.equal(readExerciseCatalogPage("99999").invalid,true);
});
test("stable accent-insensitive alphabetical listing",()=>{
  assert.deepEqual(sortExerciseCatalog(data,"name-asc").map(x=>x.latestVersion.exercise_id),["a","b","d","c"]);
  assert.deepEqual(sortExerciseCatalog(data,"name-desc").map(x=>x.latestVersion.exercise_id),["c","d","b","a"]);
});
test("recent and oldest never put malformed timestamps before valid history",()=>{
  assert.deepEqual(sortExerciseCatalog(data,"recent").map(x=>x.latestVersion.exercise_id),["a","d","c","b"]);
  assert.deepEqual(sortExerciseCatalog(data,"oldest").map(x=>x.latestVersion.exercise_id),["c","d","a","b"]);
});
test("published and version number sort by factual saved metadata",()=>{
  assert.deepEqual(sortExerciseCatalog(data,"published").map(x=>x.latestVersion.exercise_id),["b","a","c","d"]);
  assert.deepEqual(sortExerciseCatalog(data,"versions").map(x=>x.latestVersion.exercise_id),["d","c","a","b"]);
});
test("does not mutate original collection and ties break by exercise ID",()=>{
 const rows=[row("b","Nome","2026-10-10T10:00:00Z",null,1),row("a","Nome","2026-10-10T10:00:00Z",null,1)];
 assert.deepEqual(sortExerciseCatalog(rows,"recent").map(x=>x.latestVersion.exercise_id),["a","b"]);
 assert.equal(rows[0].latestVersion.exercise_id,"b");
});
test("pagination preserves total, clamps stale page and supports independent navigation",()=>{
 const rows=Array.from({length:30},(_,i)=>i);
 const second=paginateExerciseCatalog(rows,"2");
 assert.deepEqual({length:second.items.length,from:second.from,to:second.to,page:second.page,pages:second.pages},
  {length:12,from:13,to:24,page:2,pages:3});
 assert.equal(second.previous,1);assert.equal(second.next,3);
 const beyond=paginateExerciseCatalog(rows,"8");
 assert.equal(beyond.page,3);assert.equal(beyond.invalid,true);assert.equal(beyond.items.length,6);
 assert.equal(paginateExerciseCatalog([],"1").from,0);
});
test("URLs carry only allowed filters and context to detail/back",()=>{
 assert.equal(exerciseCatalogHref({term:"  bíceps  ",status:"published",sort:"name-asc",page:4,anchor:"biblioteca-exercicios"}),
  "/admin/exercicios?q=b%C3%ADceps&status=published&ordem=name-asc&pagina=4#biblioteca-exercicios");
 assert.equal(exerciseCatalogHref({}),"/admin/exercicios");
 assert.deepEqual(catalogVisiblePageNumbers(7,16),[1,6,7,8,16]);
});
