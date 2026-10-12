export type AiQueueQuery={q?:unknown;tipo?:unknown;pagina?:unknown};
export function readAiQueueQuery(query:AiQueueQuery,knownPurposes:readonly string[]){
 const text=typeof query.q==="string"?query.q.trim().slice(0,100):"";
 const purpose=typeof query.tipo==="string"&&knownPurposes.includes(query.tipo)?query.tipo:"all";
 const valid=typeof query.pagina==="string"&&/^[1-9][0-9]{0,5}$/.test(query.pagina);
 return {text,purpose,page:valid?Number(query.pagina):1,invalid:(query.q!==undefined&&typeof query.q!=="string")||(query.tipo!==undefined&&query.tipo!=="all"&&query.tipo!==purpose)||(query.pagina!==undefined&&!valid)};
}
type AiQueueRow={purpose_key:string;clients?:{full_name?:string|null;profiles?:{display_name?:string|null}|null}|null};
function normalized(value:string){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");}
export function exploreAiQueue<T extends AiQueueRow>(rows:readonly T[],q:ReturnType<typeof readAiQueueQuery>){
 const filtered=rows.filter(x=>(q.purpose==="all"||x.purpose_key===q.purpose)&&(!q.text||normalized(x.clients?.full_name||x.clients?.profiles?.display_name||"").includes(normalized(q.text))));
 const pages=Math.max(1,Math.ceil(filtered.length/12)),page=Math.min(pages,Math.max(1,q.page)),start=(page-1)*12;
 return {items:filtered.slice(start,start+12),total:filtered.length,pages,page};
}
export function aiQueueHref(query:ReturnType<typeof readAiQueueQuery>,page:number){
 const p=new URLSearchParams();if(query.text)p.set("q",query.text);if(query.purpose!=="all")p.set("tipo",query.purpose);if(page>1)p.set("pagina",String(page));
 return "/admin/ia"+(p.size?"?"+p:"");
}
