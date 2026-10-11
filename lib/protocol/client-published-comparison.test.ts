import assert from "node:assert/strict";
import test from "node:test";
import {buildClientPublishedNutritionView} from "./client-published-view.ts";
import {compareClientPublishedNutrition,selectClientPublishedComparison} from "./client-published-comparison.ts";
const visible=[{id:"new"},{id:"old"},{id:"older"}];
test("comparison only resolves baseline from authorized published IDs",()=>{
  assert.equal(selectClientPublishedComparison(visible,"new",undefined).baseline?.id,"old");
  assert.equal(selectClientPublishedComparison(visible,"new","older").baseline?.id,"older");
  const invalid=selectClientPublishedComparison(visible,"new","other-client-id");
  assert.equal(invalid.invalid,true);assert.equal(invalid.baseline?.id,"old");
  assert.equal(selectClientPublishedComparison(visible,"new",["old"]).invalid,true);
  assert.equal(selectClientPublishedComparison(visible,"not-authorized","old").baseline,null);
  assert.equal(selectClientPublishedComparison(visible,"older",undefined).baseline,null);
});
const plan=(dose:number)=>buildClientPublishedNutritionView({
  variants:[{id:"safe",variantKey:"private-draft-secret",label:"Dia",
    meals:[{id:"meal",position:1,label:"Almoço",doseAllocations:[{id:"alloc",doseType:"protein",doseQuantity:dose}]}]}],
  cycles:[{id:"cycle",steps:[{position:1,variantId:"safe",variantKey:"private-draft-secret",variantLabel:"Dia"}]}],
});
test("comparison exposes recorded structure and dose facts, not a daily prescription or variant keys",()=>{
 const out=compareClientPublishedNutrition(plan(2),plan(1));
 assert.ok(out.rows.some(x=>x.label.includes("Proteína")&&x.baseline==="1"&&x.selected==="2"));
 assert.ok(out.changed>0);
 assert.equal(JSON.stringify(out).includes("private-draft-secret"),false);
 assert.equal(out.rows.some(x=>x.label.includes("meta diária")),false);
});
test("unchanged published versions are distinguishable from missing nutrition structures",()=>{
 const equal=compareClientPublishedNutrition(plan(1),plan(1));
 assert.equal(equal.changed,0);
 const absent=compareClientPublishedNutrition(null,plan(1));
 assert.ok(absent.changed>0);
 assert.ok(absent.rows.some(x=>x.label==="Refeições registradas"&&x.selected==="0"));
});
test("invalid historic dose records disable totals rather than present partial totals as reliable",()=>{
 const invalid=compareClientPublishedNutrition(plan(-3),plan(2));
 assert.equal(invalid.totalsOmitted,true);
 assert.equal(invalid.invalidDoseRecords,1);
 assert.equal(invalid.rows.some(row=>row.label.includes("Doses registradas em")),false);
});
