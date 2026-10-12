export type ClientNoticeStatus = "all" | "pending" | "responded";
export type ClientNoticeQuery = { situacao?: unknown; pagina?: unknown };
export const CLIENT_NOTICE_PAGE_SIZE = 12;
export function readClientNoticeQuery(query:ClientNoticeQuery){
 const status=query.situacao==="pending"||query.situacao==="responded"?query.situacao:"all";
 const pageValid=typeof query.pagina==="string"&&/^[1-9][0-9]{0,5}$/.test(query.pagina);
 return {status,page:pageValid?Number(query.pagina):1,invalid:
  (query.situacao!==undefined&&query.situacao!=="all"&&query.situacao!==status)
  ||(query.pagina!==undefined&&!pageValid)};
}
export function exploreClientNotices<T extends {status:"pending"|"responded"}>(
 notices:readonly T[], query:{status:ClientNoticeStatus;page:number},
){
 const filtered=notices.filter(n=>query.status==="all"||n.status===query.status);
 const pageCount=Math.max(1,Math.ceil(filtered.length/CLIENT_NOTICE_PAGE_SIZE));
 const page=Math.min(pageCount,Math.max(1,query.page));
 const start=(page-1)*CLIENT_NOTICE_PAGE_SIZE;
 return {items:filtered.slice(start,start+CLIENT_NOTICE_PAGE_SIZE),total:filtered.length,page,pageCount,
  first:filtered.length?start+1:0,last:Math.min(filtered.length,start+CLIENT_NOTICE_PAGE_SIZE)};
}
export function clientNoticesHref(status:ClientNoticeStatus,page:number){
 const p=new URLSearchParams();
 if(status!=="all")p.set("situacao",status);
 if(page>1&&Number.isSafeInteger(page))p.set("pagina",String(page));
 const query=p.toString();
 return "/cliente/avisos"+(query?"?"+query:"");
}
