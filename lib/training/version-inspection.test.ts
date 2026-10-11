import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTrainingVersions, paginateTrainingRequests, parseTrainingHistoryPage,
  trainingComparePreviousPublishedIndex, trainingRequestHistoryHref,
  TRAINING_REQUESTS_PER_PAGE,
} from "./version-inspection.ts";

const baseVersion = {id:"v1",version_number:1,title:"Treino A",notes:null};
const nextVersion = {id:"v2",version_number:2,title:"Treino B",notes:"Orientação individual"};
const row = (id:string, position:number, overrides:Partial<{
  exercise_name:string; exercise_version_id:string|null; sets_text:string;
  repetitions_text:string; rest_text:string|null; execution_notes:string|null;
}> = {}) => ({
  id, position, exercise_name:"Agachamento", exercise_version_id:null, sets_text:"3",
  repetitions_text:"10", rest_text:null, execution_notes:null, ...overrides,
});

test("first manual plan reports no invented previous prescription or added-position interpretation",()=>{
  const result=compareTrainingVersions(null,[],nextVersion,[row("a",1)]);
  assert.equal(result.beforeVersion,null);
  assert.equal(result.afterItemCount,1);
  assert.deepEqual(result.positions,[]);
  assert.equal(result.totalDifferences,0);
});

test("same persisted content has no differences even when row IDs changed between versions",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1)],{...baseVersion,id:"v2",version_number:2},[row("b",1)]);
  assert.equal(result.unchanged,1);
  assert.equal(result.totalDifferences,0);
});

test("title and notes are separate factual metadata differences",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1)],nextVersion,[row("b",1)]);
  assert.deepEqual(result.metadata.map(x=>x.key),["title","notes"]);
  assert.equal(result.metadata[1].before,"Não informado");
  assert.equal(result.totalDifferences,2);
});

test("comparison aligns positions only; replacing the exercise name does not claim a biological progression",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1)],{...baseVersion,id:"v2",version_number:2},[row("b",1,{exercise_name:"Remada"})]);
  assert.equal(result.changed,1);
  assert.equal(result.positions[0].position,1);
  assert.deepEqual(result.positions[0].changes.map(x=>x.key),["exercise_name"]);
});

test("all professional prescription fields are compared independently without any numeric interpretation",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1)],{...baseVersion,version_number:2},[row("b",1,{
    sets_text:"4",repetitions_text:"8–12",rest_text:"90s",execution_notes:"Posição adaptada",
    exercise_version_id:"internal-version",
  })]);
  assert.deepEqual(result.positions[0].changes.map(x=>x.key),[
    "sets_text","repetitions_text","rest_text","execution_notes","exercise_version_id",
  ]);
  assert.equal(result.totalDifferences,5);
  assert.equal(JSON.stringify(result).includes("internal-version"),false);
});

test("change between distinct internal catalog versions remains visible without disclosing UUIDs",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1,{exercise_version_id:"old-key"})],
    {...baseVersion,version_number:2},[row("b",1,{exercise_version_id:"new-key"})]);
  assert.equal(result.positions[0].changes.length,1);
  assert.equal(JSON.stringify(result).includes("new-key"),false);
  assert.equal(JSON.stringify(result).includes("old-key"),false);
});

test("removed, included and unchanged position slots are accounted separately",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1),row("b",2)],
    {...baseVersion,version_number:2},[row("c",1),row("d",3)]);
  assert.deepEqual(result.positions.map(x=>[x.position,x.state]),[
    [1,"unchanged"],[2,"removed"],[3,"included"],
  ]);
  assert.deepEqual([result.included,result.removed,result.changed,result.unchanged],[1,1,0,1]);
});

test("reordered positions do not silently rematch exercises by name or ID",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1,{exercise_name:"A"}),row("b",2,{exercise_name:"B"})],
    {...baseVersion,version_number:2},[row("c",2,{exercise_name:"A"}),row("d",1,{exercise_name:"B"})]);
  assert.equal(result.changed,2);
  assert.deepEqual(result.positions.map(x=>x.changes[0].label),["Nome do exercício","Nome do exercício"]);
});

test("duplicate legacy positions are exposed as ambiguous instead of discarding rows",()=>{
  const result=compareTrainingVersions(baseVersion,[row("a",1),row("b",1)],
    {...baseVersion,version_number:2},[row("c",1)]);
  assert.equal(result.ambiguous,1);
  assert.equal(result.positions[0].beforeCount,2);
  assert.equal(result.positions[0].changes.length,0);
});

test("input snapshots and item order remain unchanged for audited versions",()=>{
  const before=[row("a",3),row("b",1)],after=[row("c",1),row("d",3)];
  compareTrainingVersions(baseVersion,before,nextVersion,after);
  assert.deepEqual(before.map(x=>x.position),[3,1]);
  assert.deepEqual(after.map(x=>x.position),[1,3]);
});

test("a displayed historic version compares only to its chronologically previous publication",()=>{
  assert.equal(trainingComparePreviousPublishedIndex(0,3),1);
  assert.equal(trainingComparePreviousPublishedIndex(1,3),2);
  assert.equal(trainingComparePreviousPublishedIndex(2,3),null);
  for (const raw of [-1,5,0.5,NaN]) assert.equal(trainingComparePreviousPublishedIndex(raw,3),null);
});

test("history pagination returns full scoped range and deterministic boundaries",()=>{
  const requests=Array.from({length:TRAINING_REQUESTS_PER_PAGE*2+1},(_,i)=>i);
  const first=paginateTrainingRequests(requests,undefined);
  const middle=paginateTrainingRequests(requests,"2");
  const last=paginateTrainingRequests(requests,"3");
  assert.deepEqual([first.from,first.to,first.total,first.pageCount],[1,10,21,3]);
  assert.deepEqual([middle.from,middle.to,middle.previous,middle.next],[11,20,1,3]);
  assert.deepEqual([last.from,last.to,last.next],[21,21,null]);
  assert.deepEqual(first.items,requests.slice(0,10));
  assert.deepEqual(requests,Array.from({length:21},(_,i)=>i));
});

test("invalid pagination URLs safely show authorized first page",()=>{
  const requests=Array.from({length:11},(_,i)=>i);
  for(const value of [null,"","0","01","-1","2.5","1e2","100001",["2"],{},false]){
    assert.equal(paginateTrainingRequests(requests,value).invalid,true);
    assert.equal(paginateTrainingRequests(requests,value).page,1);
  }
  const over=paginateTrainingRequests(requests,"80");
  assert.equal(over.page,2);
  assert.equal(over.invalid,true);
  assert.equal(parseTrainingHistoryPage(undefined).invalid,false);
});

test("empty and one-page request histories have correct controls",()=>{
  const empty=paginateTrainingRequests([],undefined);
  assert.deepEqual([empty.total,empty.pageCount,empty.from,empty.to,empty.previous,empty.next],[0,1,0,0,null,null]);
  const single=paginateTrainingRequests(["a"],undefined);
  assert.equal(single.pageCount,1);
  assert.equal(single.next,null);
});

test("pagination links carry no request note or patient identifier in the query",()=>{
  assert.equal(trainingRequestHistoryHref("/cliente/treino",1,"suas-solicitacoes"),"/cliente/treino#suas-solicitacoes");
  assert.equal(trainingRequestHistoryHref("/cliente/treino",2,"suas-solicitacoes"),"/cliente/treino?pedidos=2#suas-solicitacoes");
  assert.equal(trainingRequestHistoryHref("/admin/clientes/id/treino",3,"historico-solicitacoes-treino"),
    "/admin/clientes/id/treino?pedidos=3#historico-solicitacoes-treino");
});
