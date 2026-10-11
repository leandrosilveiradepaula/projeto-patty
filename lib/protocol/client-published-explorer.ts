import type { CurrentClientPublishedProtocol } from "../supabase/data-access.ts";
import type { buildClientPublishedNutritionView } from "./client-published-view.ts";

export type PublishedView = ReturnType<typeof buildClientPublishedNutritionView>;
export type PublishedHistoryItem = Pick<CurrentClientPublishedProtocol,
  "id" | "versionNumber" | "protocolType" | "publishedAt">;
export type PublishedHistoryOrder = "recent" | "oldest" | "version";
export const PUBLISHED_HISTORY_PAGE_SIZE = 8;

function normalized(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    : "";
}
export function normalizePublishedSearch(value: unknown): string { return normalized(value); }

export function publishedHistoryOrder(value: unknown): PublishedHistoryOrder {
  return value === "oldest" || value === "version" ? value : "recent";
}

function publicationTime(value: string): number | null {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
export function publishedProtocolDate(value: string): string {
  const time=publicationTime(value);
  return time === null ? "Data indisponível" : new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo",
  }).format(new Date(time));
}

/** Everything here is already client-scoped, published and authorized by the server. */
export function findPublishedHistory<T extends PublishedHistoryItem>(
  items: readonly T[], rawSearch: unknown, rawOrder: unknown,
): T[] {
  const query=normalized(rawSearch), order=publishedHistoryOrder(rawOrder);
  const matched=items.filter(item => {
    if (!query) return true;
    const label=[String(item.versionNumber), "versao "+item.versionNumber,
      publishedProtocolDate(item.publishedAt), item.protocolType === "nutrition" ? "alimentacao" : item.protocolType]
      .join(" ");
    return normalized(label).includes(query);
  });
  return matched.slice().sort((a,b) => {
    if (order === "version") {
      const v=b.versionNumber-a.versionNumber;
      if (v) return v;
    }
    const left=publicationTime(a.publishedAt), right=publicationTime(b.publishedAt);
    if (left !== null && right !== null && left !== right) {
      return order === "oldest" ? left-right : right-left;
    }
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    return a.id.localeCompare(b.id);
  });
}
export function readPublishedHistoryPage(raw: unknown): {page:number; invalid:boolean} {
  if (raw === undefined || raw === "1") return {page:1,invalid:false};
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,4}$/.test(raw)) return {page:1,invalid:true};
  const page=Number(raw);
  return page <= 10000 ? {page,invalid:false} : {page:1,invalid:true};
}
export function paginatePublishedHistory<T>(items:readonly T[], raw: unknown, size=PUBLISHED_HISTORY_PAGE_SIZE){
  const requested=readPublishedHistoryPage(raw);
  const pageCount=Math.max(1,Math.ceil(items.length/size));
  const page=Math.min(requested.page,pageCount);
  const from=(page-1)*size;
  return {
    items:items.slice(from,from+size),
    total:items.length,page,pages:pageCount,from:items.length ? from+1 : 0,
    to:Math.min(from+size,items.length),
    previous:page>1?page-1:null,next:page<pageCount?page+1:null,
    invalid:requested.invalid || requested.page>pageCount,
  };
}
export function adjacentPublishedVersions<T extends PublishedHistoryItem>(items:readonly T[], selectedId:string){
  const index=items.findIndex(item=>item.id===selectedId);
  return {
    newer:index>0 ? items[index-1]:null,
    older:index>=0 && index<items.length-1 ? items[index+1]:null,
  };
}

export type PublishedDoseTotal={doseType:string;quantity:number;allocations:number};
export type PublishedVariantTotals={
  id:string; label:string; meals:number; allocations:number;
  doses:PublishedDoseTotal[];
};
function aggregateDoseGroups(entries:readonly {doseType:string;doseQuantity:number}[]){
  const amounts=new Map<string,{quantity:number;allocations:number}>();
  let invalid=0;
  for (const entry of entries) {
    if (!Number.isFinite(entry.doseQuantity) || entry.doseQuantity < 0) {
      invalid++; continue;
    }
    const current=amounts.get(entry.doseType) ?? {quantity:0,allocations:0};
    current.quantity+=entry.doseQuantity;
    current.allocations++;
    amounts.set(entry.doseType,current);
  }
  return {totals:[...amounts].map(([doseType,t])=>({doseType,...t}))
      .sort((a,b)=>a.doseType.localeCompare(b.doseType,"pt-BR")), invalid};
}

/** Totals are sums of records across ALL variants, NEVER a daily prescription. */
export function summarizePublishedNutrition(view:PublishedView | null){
  if (!view) return null;
  const variants:PublishedVariantTotals[]=view.variants.map(v=>{
    const entries=v.meals.flatMap(m=>m.doseGroups);
    return {id:v.id,label:v.label,meals:v.meals.length,allocations:entries.length,
      doses:aggregateDoseGroups(entries).totals};
  });
  const allEntries=view.variants.flatMap(v=>v.meals.flatMap(m=>m.doseGroups));
  const aggregation=aggregateDoseGroups(allEntries);
  return {
    variantCount:view.variantCount,mealCount:view.mealCount,
    cycleCount:view.cycleCount,stepCount:view.stepCount,
    allocations:allEntries.length,invalidAllocations:aggregation.invalid,
    doses:aggregation.totals,variants,
  };
}

export function labelPublishedDoseType(type:string){
  return ({protein:"Proteína",carbohydrate:"Carboidrato",fat:"Gordura"} as Record<string,string>)[type] ?? type;
}
export function formatPublishedDoseAmount(amount:number){
  return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:4}).format(amount);
}
export function publishedNutritionDoseTypes(view: PublishedView):string[]{
  const found=new Set(view.variants.flatMap(v=>v.meals.flatMap(m=>m.doseGroups.map(g=>g.doseType))));
  return [...found].sort((a,b)=>labelPublishedDoseType(a).localeCompare(labelPublishedDoseType(b),"pt-BR"));
}

/** Matches a specific published meal, never a different meal in the same variant. */
export function publishedMealMatches(view:PublishedView, rawSearch:unknown, rawDoseType:unknown){
  const query=normalized(rawSearch);
  const doseType=typeof rawDoseType==="string" ? rawDoseType : "all";
  const knownTypes=new Set(publishedNutritionDoseTypes(view));
  if(doseType!=="all"&&!knownTypes.has(doseType))return [];
  return view.variants.flatMap(variant =>
    variant.meals.filter(meal => {
      const phrase=normalized(variant.label+" "+meal.label);
      const matchesText=!query||phrase.includes(query);
      const matchesDose=doseType==="all"||meal.doseGroups.some(group=>group.doseType===doseType);
      return matchesText&&matchesDose;
    }).map(meal=>({
      id:meal.id,label:meal.label,position:meal.order,variantId:variant.id,
      variantLabel:variant.label,doseTypes:meal.doseGroups.map(x=>x.doseType),
    })),
  );
}

/** Search is a navigation aid; it does NOT change/pick the client's active phase. */
export function publishedVariantMatches(view:PublishedView, rawTerm:unknown, doseType:string):Array<{id:string;label:string;meals:number}> {
  const matches=publishedMealMatches(view,rawTerm,doseType);
  const matchedVariantIds=new Set(matches.map(meal=>meal.variantId));
  return view.variants.filter(variant=>{
    // Keep empty variants discoverable when there are no search constraints.
    if(variant.meals.length===0&&doseType==="all") {
      const query=normalizePublishedSearch(rawTerm);
      return !query||normalizePublishedSearch(variant.label).includes(query);
    }
    return matchedVariantIds.has(variant.id);
  }).map(variant=>({id:variant.id,label:variant.label,meals:variant.meals.length}));
}
