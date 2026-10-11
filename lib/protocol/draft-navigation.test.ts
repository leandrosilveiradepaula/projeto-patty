import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtocolDraftNavigation, searchDraftDirectory,
  draftMealAnchor, draftCycleAnchor, draftVariantAnchor,
} from "./draft-navigation.ts";
const one = {
  variants: [
    { id: "v1", label: "Dia 1", variantKey: "d1", meals: [
      {id:"m1",label:"Almoço",position:1,doseAllocations:[{type:"protein"}]},
      {id:"m2",label:"Jantar",position:2,doseAllocations:[]},
    ] },
    { id: "v2", label: "Dia 2", variantKey: "d2", meals: [] },
  ],
  cycles: [
    {id:"c1",steps:[{position:1,variantId:"v1"},{position:2,variantId:"v1"}]},
    {id:"c2",steps:[]},
  ],
};
test("missing plan navigates to creation without inventing phases", () => {
  const x=buildProtocolDraftNavigation(null);
  assert.equal(x.ready,false);
  assert.equal(x.issues.length,1);
  assert.equal(x.issues[0].href,"#rascunho-plano-iniciar");
});
test("zero variants links to actual addition",()=>{
  const x=buildProtocolDraftNavigation({variants:[],cycles:[]});
  assert.deepEqual(x.issues.map(i=>i.href),["#rascunho-variacao-adicionar"]);
});
test("all incomplete entities have distinct actionable anchors, not first error only",()=>{
  const x=buildProtocolDraftNavigation(one);
  assert.equal(x.ready,false);
  assert.equal(x.issues.length,3);
  assert.deepEqual(x.issues.map(i=>i.href),[
    "#"+draftMealAnchor("m2"),"#"+draftVariantAnchor("v2"),"#"+draftCycleAnchor("c2")]);
});
test("saved counters are factual and no weekly or adherence score is inferred",()=>{
  const x=buildProtocolDraftNavigation(one);
  assert.deepEqual(x.totals,{variants:2,meals:2,doses:1,cycles:2,steps:2});
  assert.equal(x.unreferencedVariantCount,1);
  assert.equal(x.cyclePresent,true);
});
test("cycle absent is optional and unreferenced is not a validation blocker",()=>{
  const ready=buildProtocolDraftNavigation({variants:[{
    id:"v",label:null,variantKey:"linear",meals:[{id:"m",label:null,position:1,doseAllocations:[{}]}],
  }],cycles:[]});
  assert.equal(ready.ready,true);
  assert.equal(ready.issues.length,0);
  assert.equal(ready.unreferencedVariantCount,0);
});
test("repeated labels remain individually addressable; name repetition is information only",()=>{
  const plan={variants:[{...one.variants[0],meals:[one.variants[0].meals[0]]},{...one.variants[0],id:"v3",meals:[one.variants[0].meals[0]]}],cycles:[]};
  const result=buildProtocolDraftNavigation(plan);
  assert.equal(result.repeatedNameCount,1);
  assert.notEqual(result.directory[0].href,result.directory[2].href);
  assert.equal(result.ready,true);
});
test("broken target flagged factually without inventing a protocol rule",()=>{
 const x=buildProtocolDraftNavigation({variants:[one.variants[0]],cycles:[{id:"c1",steps:[{position:1,variantId:"deleted"}]}]});
 assert.equal(x.missingCycleTargetCount,1);
});
test("search is case and diacritic-insensitive and never mutates ordering",()=>{
 const items=buildProtocolDraftNavigation(one).directory;
 assert.equal(searchDraftDirectory(items,"almoco")[0].id,"m1");
 assert.equal(searchDraftDirectory(items,"DIA")[0].id,"v1");
 assert.equal(searchDraftDirectory(items,["m1"]).length,items.length);
 assert.equal(items.length,6);
 assert.equal(searchDraftDirectory(items,"nao existe").length,0);
});
test("empty steps per cycle and duplicate usage count are separate from readiness",()=>{
 const x=buildProtocolDraftNavigation(one);
 assert.equal(x.directory.find(i=>i.id==="v1")?.description.includes("2 uso(s)"),true);
 assert.equal(x.directory.find(i=>i.id==="c2")?.description.includes("0 etapa(s)"),true);
});
