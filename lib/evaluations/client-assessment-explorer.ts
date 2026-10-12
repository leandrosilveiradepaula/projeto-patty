export type AssessmentMeasureFilter="all"|"with"|"without";
export function readAssessmentExplorer(raw:{medidas?:unknown;pagina?:unknown}){
 const measure:AssessmentMeasureFilter=raw.medidas==="with"||raw.medidas==="without"?raw.medidas:"all";
 const valid=typeof raw.pagina==="string"&&/^[1-9][0-9]{0,5}$/.test(raw.pagina);
 return {measure,page:valid?Number(raw.pagina):1,invalid:(raw.medidas!==undefined&&raw.medidas!=="all"&&raw.medidas!==measure)||(raw.pagina!==undefined&&!valid)};
}
export function exploreAssessmentMeasures<T extends {measurements:readonly unknown[]}>(rows:readonly T[],filter:ReturnType<typeof readAssessmentExplorer>){
 const filtered=rows.filter(x=>filter.measure==="all"||(filter.measure==="with"?x.measurements.length>0:x.measurements.length===0));
 const pages=Math.max(1,Math.ceil(filtered.length/12)),page=Math.max(1,Math.min(pages,filter.page)),start=(page-1)*12;
 return {items:filtered.slice(start,start+12),total:filtered.length,pages,page,from:filtered.length?start+1:0,to:Math.min(filtered.length,start+12)};
}
export function assessmentExplorerHref(measure:AssessmentMeasureFilter,page:number){
 const p=new URLSearchParams();if(measure!=="all")p.set("medidas",measure);if(page>1)p.set("pagina",String(page));
 return "/cliente/avaliacoes"+(p.size?"?"+p:"")+"#historico-avaliacoes";
}
