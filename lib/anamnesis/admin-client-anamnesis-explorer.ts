export type AdminAnamnesisQuery={versao?:unknown; pendentes?:unknown; enviadas?:unknown};
export function readAdminAnamnesisQuery(raw:AdminAnamnesisQuery,versions:readonly number[]){
 const version=typeof raw.versao==="string"&&versions.some(n=>String(n)===raw.versao)?raw.versao:"all";
 const isPage=(x:unknown)=>typeof x==="string"&&/^[1-9][0-9]{0,5}$/.test(x);
 return {version,pending:isPage(raw.pendentes)?Number(raw.pendentes):1,submitted:isPage(raw.enviadas)?Number(raw.enviadas):1,
 invalid:(raw.versao!==undefined&&raw.versao!=="all"&&raw.versao!==version)||
 (raw.pendentes!==undefined&&!isPage(raw.pendentes))||(raw.enviadas!==undefined&&!isPage(raw.enviadas))};
}
export function filterAdminAnamneses<T extends {anamnesis_form_versions?:{version_number:number}|null}>(rows:readonly T[],version:string){
 return rows.filter(item=>version==="all"||String(item.anamnesis_form_versions?.version_number)===version);
}
export function pageAdminAnamneses<T>(rows:readonly T[],requested:number){
 const size=12,pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.max(1,Math.min(pages,requested));
 return {items:rows.slice((page-1)*size,page*size),page,pages,total:rows.length};
}
export function adminAnamnesisHref(clientId:string,version:string,pending:number,submitted:number,section:"pending"|"submitted"){
 const qs=new URLSearchParams();if(version!=="all")qs.set("versao",version);if(pending>1)qs.set("pendentes",String(pending));if(submitted>1)qs.set("enviadas",String(submitted));
 return "/admin/clientes/"+encodeURIComponent(clientId)+"/anamnese"+(qs.size?"?"+qs:"")+"#anamnese-"+section;
}
