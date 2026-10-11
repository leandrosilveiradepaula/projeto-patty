import assert from "node:assert/strict";
import test from "node:test";
import {findPublishedHistory,paginatePublishedHistory,readPublishedHistoryPage,adjacentPublishedVersions,
  normalizePublishedSearch, publishedProtocolDate, summarizePublishedNutrition, labelPublishedDoseType,
  publishedNutritionDoseTypes, publishedVariantMatches, publishedMealMatches, formatPublishedDoseAmount,
} from "./client-published-explorer.ts";
import {buildClientPublishedNutritionView} from "./client-published-view.ts";

const items=[
{id:"a",versionNumber:1,publishedAt:"2026-10-01T16:00:00-03:00",protocolType:"nutrition"},
{id:"b",versionNumber:3,publishedAt:"2026-10-04T11:00:00+02:00",protocolType:"nutrition"},
{id:"c",versionNumber:2,publishedAt:"invalid",protocolType:"nutrition"},
];
test("history search recognizes version, date and accents without exposing IDs",()=>{
 assert.deepEqual(findPublishedHistory(items,"versao 3","recent").map(x=>x.id),["b"]);
 assert.deepEqual(findPublishedHistory(items,"alimentação","recent").map(x=>x.id),["b","a","c"]);
 assert.deepEqual(findPublishedHistory(items,"02/10/2026","recent").map(x=>x.id),[]);
 assert.equal(normalizePublishedSearch(["a"]),"");
});
test("history ordering compares instants, puts invalid dates last and can order by version",()=>{
 assert.deepEqual(findPublishedHistory(items,"","recent").map(x=>x.id),["b","a","c"]);
 assert.deepEqual(findPublishedHistory(items,"","oldest").map(x=>x.id),["a","b","c"]);
 assert.deepEqual(findPublishedHistory(items,"","version").map(x=>x.id),["b","c","a"]);
 assert.equal(publishedProtocolDate("bad"),"Data indisponível");
});
test("page selection bounds, clamping, no results and previous/next",()=>{
 const many=Array.from({length:20},(_,i)=>i);
 const slice=paginatePublishedHistory(many,"2");
 assert.deepEqual({from:slice.from,to:slice.to,page:slice.page,pages:slice.pages},{from:9,to:16,page:2,pages:3});
 assert.equal(slice.previous,1);assert.equal(slice.next,3);
 assert.equal(paginatePublishedHistory(many,"99").page,3);
 assert.equal(paginatePublishedHistory(many,"99").invalid,true);
 assert.equal(paginatePublishedHistory([],"1").from,0);
 for(const bad of ["0","-1","01","1e3",["2"],100]) assert.equal(readPublishedHistoryPage(bad).invalid,true);
});
test("adjacent versions preserve actual authorized order only",()=>{
 assert.deepEqual(adjacentPublishedVersions(items,"b"),{newer:items[0],older:items[2]});
 assert.deepEqual(adjacentPublishedVersions(items,"unauthorized"),{newer:null,older:null});
});
const plan=buildClientPublishedNutritionView({
 variants:[
 {id:"one",label:"Dia 1",variantKey:"secret-1",meals:[
   {id:"m1",position:1,label:"Café",doseAllocations:[
      {id:"d1",doseType:"protein",doseQuantity:1.5},{id:"d2",doseType:"fat",doseQuantity:2}]},
   {id:"m2",position:2,label:"Almoço",doseAllocations:[{id:"d3",doseType:"protein",doseQuantity:0.5}]},
 ]},
 {id:"two",label:"Dia 2",variantKey:"secret-2",meals:[
    {id:"m3",position:1,label:"Jantar",doseAllocations:[{id:"d4",doseType:"carbohydrate",doseQuantity:2}]}
 ]},
 ], cycles:[{id:"c1",steps:[{position:1,variantId:"one",variantKey:"secret-1",variantLabel:"Dia 1"}]}],
});
test("factual totals count registrations, not a daily plan or inferred phase",()=>{
 const t=summarizePublishedNutrition(plan)!;
 assert.deepEqual([t.variantCount,t.mealCount,t.cycleCount,t.stepCount,t.allocations],[2,3,1,1,4]);
 assert.deepEqual(t.doses.map(g=>[g.doseType,g.quantity]),[["carbohydrate",2],["fat",2],["protein",2]]);
 assert.deepEqual(t.variants[0].doses.map(g=>[g.doseType,g.quantity]),[["fat",2],["protein",2]]);
 assert.equal(summarizePublishedNutrition(null),null);
 assert.equal(JSON.stringify(t).includes("secret-1"),false);
});
test("dose labels preserve unexpected categories and format fractional counts",()=>{
 assert.equal(labelPublishedDoseType("protein"),"Proteína");
 assert.equal(labelPublishedDoseType("future-type"),"future-type");
 assert.equal(formatPublishedDoseAmount(1.25),"1,25");
 assert.deepEqual(publishedNutritionDoseTypes(plan),["carbohydrate","fat","protein"]);
});
test("variant search includes meal names without changing stored variants",()=>{
 assert.deepEqual(publishedVariantMatches(plan,"almoco","all").map(v=>v.id),["one"]);
 assert.deepEqual(publishedVariantMatches(plan,"","carbohydrate").map(v=>v.id),["two"]);
 assert.deepEqual(publishedVariantMatches(plan,"dia 1","carbohydrate").map(v=>v.id),[]);
 assert.deepEqual(publishedVariantMatches(plan,["array"],"all").map(v=>v.id),["one","two"]);
 assert.deepEqual(plan.variants.map(v=>v.id),["one","two"]);
});

test("meal search and dose constraints must belong to the same recorded meal",()=>{
 assert.deepEqual(publishedMealMatches(plan,"cafe","protein").map(x=>x.id),["m1"]);
 assert.deepEqual(publishedMealMatches(plan,"cafe","carbohydrate").map(x=>x.id),[]);
 assert.deepEqual(publishedMealMatches(plan,"","carbohydrate").map(x=>x.id),["m3"]);
 assert.deepEqual(publishedMealMatches(plan,"dia 2","carbohydrate").map(x=>x.id),["m3"]);
 assert.deepEqual(publishedVariantMatches(plan,"cafe","carbohydrate").map(x=>x.id),[]);
 assert.deepEqual(publishedMealMatches(plan,"","not-a-published-dose"),[]);
});

test("empty published variants remain navigable by their name without manufacturing meals",()=>{
 const empty=buildClientPublishedNutritionView({variants:[{id:"empty",label:"Variação sem refeições",variantKey:"opaque",meals:[]}],cycles:[]});
 assert.deepEqual(publishedVariantMatches(empty,"variacao","all").map(x=>x.id),["empty"]);
 assert.deepEqual(publishedMealMatches(empty,"variacao","all"),[]);
});
