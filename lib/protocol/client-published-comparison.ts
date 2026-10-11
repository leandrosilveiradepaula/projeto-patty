import type { PublishedView } from "./client-published-explorer.ts";
import { labelPublishedDoseType, summarizePublishedNutrition, formatPublishedDoseAmount } from "./client-published-explorer.ts";

export type PublicComparisonPublication = { id: string; mealPlan: unknown };
export function selectClientPublishedComparison<T extends {id:string}>(
  authorized: readonly T[],
  selectedId: string | null,
  requestedBaselineId: unknown,
) {
  const selectedIndex=authorized.findIndex(p=>p.id===selectedId);
  const selectable=authorized.filter(item=>item.id!==selectedId);
  if(selectedIndex<0)return {baseline:null,invalid:false,options:[] as T[]};
  // The default is the chronological predecessor, not an unpublished draft.
  const defaultBaseline=authorized[selectedIndex+1]??null;
  if(requestedBaselineId===undefined){
    return {baseline:defaultBaseline,invalid:false,options:selectable};
  }
  const found=typeof requestedBaselineId==="string"
    ? selectable.find(item=>item.id===requestedBaselineId)??null : null;
  return {
    baseline:found??defaultBaseline,
    invalid:!found,
    options:selectable,
  };
}

export type PublishedProtocolComparisonRow = {
  label:string;
  baseline:string;
  selected:string;
  changed:boolean;
};

function cycleSequence(view:PublishedView){
  if(view.cycles.length===0)return "Nenhum ciclo registrado";
  return view.cycles.map((cycle,i)=>{
    const steps=cycle.steps.map(step=>step.position+". "+step.label).join(" → ");
    return "Ciclo "+(i+1)+": "+(steps||"sem etapas");
  }).join(" | ");
}
function factualStructure(view:PublishedView|null){
  if(!view)return {variants:0,meals:0,cycles:0,steps:0,allocations:0,invalid:0};
  const summary=summarizePublishedNutrition(view);
  return {
    variants:view.variantCount,meals:view.mealCount,cycles:view.cycleCount,
    steps:view.stepCount,allocations:summary?.allocations??0,
    invalid:summary?.invalidAllocations??0,
  };
}
/** No keys, raw draft snapshot, private identifiers or daily prescription output. */
export function compareClientPublishedNutrition(
  selectedView:PublishedView|null, baselineView:PublishedView|null,
) {
  const current=factualStructure(selectedView),baseline=factualStructure(baselineView);
  const rows:PublishedProtocolComparisonRow[]=[];
  const add=(label:string,b:string,c:string)=>{
    rows.push({label,baseline:b,selected:c,changed:b!==c});
  };
  for(const [label,key] of [
    ["Variações registradas","variants"],["Refeições registradas","meals"],
    ["Alocações de dose","allocations"],["Ciclos registrados","cycles"],
    ["Etapas de ciclos","steps"],
  ] as const){
    add(label,String(baseline[key]),String(current[key]));
  }
  add("Sequência textual dos ciclos",
    baselineView?cycleSequence(baselineView):"Plano sem estrutura alimentar",
    selectedView?cycleSequence(selectedView):"Plano sem estrutura alimentar");
  const currentSummary=summarizePublishedNutrition(selectedView);
  const baselineSummary=summarizePublishedNutrition(baselineView);
  const invalid=(current.invalid+baseline.invalid)>0;
  if(!invalid){
    const types=[...new Set([
      ...(baselineSummary?.doses??[]).map(d=>d.doseType),
      ...(currentSummary?.doses??[]).map(d=>d.doseType),
    ])].sort();
    for(const type of types){
      const before=baselineSummary?.doses.find(d=>d.doseType===type)?.quantity??0;
      const after=currentSummary?.doses.find(d=>d.doseType===type)?.quantity??0;
      add("Doses registradas em todas as variações · "+labelPublishedDoseType(type),
        formatPublishedDoseAmount(before),formatPublishedDoseAmount(after));
    }
  }
  return {
    rows,changed:rows.filter(row=>row.changed).length,
    invalidDoseRecords:current.invalid+baseline.invalid,
    totalsOmitted:invalid,
  };
}
