export type ContentVersionRow={id:string;version_number:number;title:string;published_at:string|null;created_at:string;category_key:string|null;content_type_key:string|null;phase_key:string|null};
export type ContentVersionFilter={query:string;status:"all"|"published"|"draft";asset:"all"|"with-asset"|"without-asset";order:"newest"|"oldest"|"title";page:number;invalidPage:boolean};
export const CONTENT_VERSION_PAGE_SIZE=10;
export function readContentVersionFilter(raw:Record<string,unknown>):ContentVersionFilter{
 const valid=raw.pagina===undefined||typeof raw.pagina==="string"&&/^[1-9][0-9]{0,3}$/.test(raw.pagina);
 return {
  query:typeof raw.busca==="string"?raw.busca.trim().slice(0,120):"",
  status:raw.estado==="published"||raw.estado==="draft"?raw.estado:"all",
  asset:raw.arquivo==="with-asset"||raw.arquivo==="without-asset"?raw.arquivo:"all",
  order:raw.ordem==="oldest"||raw.ordem==="title"?raw.ordem:"newest",
  page:valid&&raw.pagina!==undefined?Number(raw.pagina):1,invalidPage:!valid,
 };
}
function normalize(t:string){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();}
export function inspectContentVersionArchive<T extends ContentVersionRow>(
 rows:readonly T[],assetCounts:ReadonlyMap<string,number>,filters:ContentVersionFilter,selectedId:unknown,
){
 const term=normalize(filters.query);
 const selected=typeof selectedId==="string"&&rows.some(r=>r.id===selectedId)?selectedId:null;
 const matching=rows.filter(row=>{
  if(filters.status==="published"&&!row.published_at)return false;
  if(filters.status==="draft"&&row.published_at)return false;
  const assets=assetCounts.get(row.id)??0;
  if(filters.asset==="with-asset"&&assets===0)return false;
  if(filters.asset==="without-asset"&&assets>0)return false;
  if(!term)return true;
  return normalize([String(row.version_number),row.title,row.category_key??"",row.content_type_key??"",row.phase_key??""].join(" ")).includes(term);
 }).sort((a,b)=>{
  if(filters.order==="oldest")return a.version_number-b.version_number||a.id.localeCompare(b.id);
  if(filters.order==="title")return a.title.localeCompare(b.title,"pt-BR",{sensitivity:"base"})||b.version_number-a.version_number||a.id.localeCompare(b.id);
  return b.version_number-a.version_number||a.id.localeCompare(b.id);
 });
 const exactIndex=selected?matching.findIndex(v=>v.id===selected):-1;
 const pages=Math.max(1,Math.ceil(matching.length/CONTENT_VERSION_PAGE_SIZE));
 const target=exactIndex>=0?Math.floor(exactIndex/CONTENT_VERSION_PAGE_SIZE)+1:filters.page;
 const page=Math.min(target,pages),start=(page-1)*CONTENT_VERSION_PAGE_SIZE;
 return {
  items:matching.slice(start,start+CONTENT_VERSION_PAGE_SIZE),total:matching.length,page,pages,
  from:matching.length?start+1:0,to:Math.min(start+CONTENT_VERSION_PAGE_SIZE,matching.length),
  previous:page>1?page-1:null,next:page<pages?page+1:null,
  invalidPage:filters.invalidPage||filters.page>pages,
  selectedHidden:Boolean(selected&&exactIndex<0),
  counts:{
   total:rows.length,published:rows.filter(r=>Boolean(r.published_at)).length,
   draft:rows.filter(r=>!r.published_at).length,
   withAsset:rows.filter(r=>(assetCounts.get(r.id)??0)>0).length,
   withoutAsset:rows.filter(r=>(assetCounts.get(r.id)??0)===0).length,
  },
 };
}
export function contentVersionArchiveHref(base:string,filters:ContentVersionFilter,page:number,versionId?:string|null){
 const p=new URLSearchParams();
 if(filters.query)p.set("busca",filters.query);
 if(filters.status!=="all")p.set("estado",filters.status);
 if(filters.asset!=="all")p.set("arquivo",filters.asset);
 if(filters.order!=="newest")p.set("ordem",filters.order);
 if(page>1&&Number.isSafeInteger(page))p.set("pagina",String(page));
 if(versionId)p.set("versao",versionId);
 return base+(p.size?"?"+p.toString():"")+"#historico-versoes-conteudos";
}
