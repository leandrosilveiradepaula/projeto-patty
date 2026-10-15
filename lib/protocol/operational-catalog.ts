import { readProtocolCatalogTerm } from "./admin-catalog-ux.ts";

/** Read-only RLS-visible protocol and lifecycle data, not publication authority. */
export type ProtocolVersionFact = {
  id: string;
  protocol_id: string;
  version_number: number;
  created_at: string;
  submitted_for_review_at: string | null;
};
export type ProtocolApprovalFact = {
  protocol_version_id: string;
  approved_at: string;
};
export type ProtocolPublicationFact = {
  id: string;
  protocol_version_id: string;
  published_at: string;
};
export type ProtocolOperationalStatus =
  "missing-version" | "draft" | "under-review" | "approved" | "published";

export type ProtocolOperationalSummary = {
  protocolId: string;
  versionCount: number;
  latestVersion: ProtocolVersionFact | null;
  latestStatus: ProtocolOperationalStatus;
  lastPublishedVersion: ProtocolVersionFact | null;
  lastPublishedAt: string | null;
  publicationCount: number;
  hasUnpublishedNewerVersion: boolean;
};

function chronologicalValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function newestPublication(
  current: { fact: ProtocolPublicationFact; version: ProtocolVersionFact } | undefined,
  candidate: { fact: ProtocolPublicationFact; version: ProtocolVersionFact },
) {
  if (!current) return candidate;
  const a=chronologicalValue(current.fact.published_at);
  const b=chronologicalValue(candidate.fact.published_at);
  if (a !== null && b !== null && a !== b) return b > a ? candidate : current;
  if (a === null && b !== null) return candidate;
  if (a !== null && b === null) return current;
  return candidate.fact.id.localeCompare(current.fact.id) < 0 ? candidate : current;
}

/**
 * Only facts whose parent versions belong to one of the authorized protocol
 * parents can influence the operational status. Publication is a separate
 * immutable event and cannot be inferred from "submitted" or "approved".
 */
export function buildProtocolOperationalSummaries(
  protocolIds: readonly string[],
  versions: readonly ProtocolVersionFact[],
  approvals: readonly ProtocolApprovalFact[],
  publications: readonly ProtocolPublicationFact[],
): ReadonlyMap<string, ProtocolOperationalSummary> {
  const parentIds=new Set(protocolIds);
  const children=new Map<string,ProtocolVersionFact[]>();
  const versionById=new Map<string,ProtocolVersionFact>();
  for(const version of versions){
    if(!parentIds.has(version.protocol_id))continue;
    if(!Number.isSafeInteger(version.version_number) || version.version_number<1)continue;
    const prior=versionById.get(version.id);
    if(prior)continue;
    versionById.set(version.id,version);
    const list=children.get(version.protocol_id)??[];
    list.push(version);
    children.set(version.protocol_id,list);
  }
  const approved=new Set(approvals.map(x=>x.protocol_version_id).filter(id=>versionById.has(id)));
  const published=new Set<string>();
  const latestPublication=new Map<string,{fact:ProtocolPublicationFact;version:ProtocolVersionFact}>();
  const publicationCounts=new Map<string,number>();
  const seenPublicationIds=new Set<string>();
  for(const fact of publications){
    const version=versionById.get(fact.protocol_version_id);
    if(!version || seenPublicationIds.has(fact.id))continue;
    seenPublicationIds.add(fact.id);
    published.add(version.id);
    publicationCounts.set(version.protocol_id,(publicationCounts.get(version.protocol_id)??0)+1);
    const current=latestPublication.get(version.protocol_id);
    latestPublication.set(version.protocol_id,newestPublication(current,{fact,version}));
  }
  const results=new Map<string,ProtocolOperationalSummary>();
  for(const id of protocolIds){
    if(results.has(id))continue;
    const candidates=children.get(id)??[];
    candidates.sort((a,b)=>
      b.version_number-a.version_number || a.id.localeCompare(b.id));
    const latest=candidates[0]??null;
    const selectedPublication=latestPublication.get(id);
    const lastVersion=selectedPublication?.version??null;
    const latestStatus:ProtocolOperationalStatus =
      !latest ? "missing-version"
      : published.has(latest.id) ? "published"
      : approved.has(latest.id) ? "approved"
      : latest.submitted_for_review_at ? "under-review"
      : "draft";
    results.set(id,{
      protocolId:id,versionCount:candidates.length,latestVersion:latest,
      latestStatus,lastPublishedVersion:lastVersion,
      lastPublishedAt:selectedPublication?.fact.published_at??null,
      publicationCount:publicationCounts.get(id)??0,
      hasUnpublishedNewerVersion:Boolean(latest && lastVersion &&
        latest.version_number>lastVersion.version_number && !published.has(latest.id)),
    });
  }
  return results;
}

export type ProtocolOperationalFilter =
  "all" | "with-version" | "needs-recovery" | "latest-draft" |
  "under-review" | "awaiting-publication" | "latest-published" |
  "published-with-newer-version" | "never-published";
export type ProtocolCatalogSort = "name" | "newest" | "oldest" | "latest-version" | "recent-publication";
export type ProtocolCatalogType = "all" | "nutrition" | "other";
export type ProtocolCatalogFilters = {
  query:string;status:ProtocolOperationalFilter;sort:ProtocolCatalogSort;
  type:ProtocolCatalogType;page:number;invalidPage:boolean;
};
export const PROTOCOL_CATALOG_PAGE_SIZE=15;
export function readProtocolCatalogPage(input:unknown){
  if(input===undefined || input==="1")return {page:1,invalid:false};
  if(typeof input!=="string" || !/^[1-9][0-9]{0,3}$/.test(input)){
    return {page:1,invalid:true};
  }
  const page=Number(input);
  return {page,invalid:!Number.isSafeInteger(page)};
}
export function readOperationalProtocolFilters(input:Record<string,unknown>):ProtocolCatalogFilters {
  const statusOptions:ProtocolOperationalFilter[]=[
    "all","with-version","needs-recovery","latest-draft","under-review",
    "awaiting-publication","latest-published","published-with-newer-version","never-published",
  ];
  const sortOptions:ProtocolCatalogSort[]=[
    "name","newest","oldest","latest-version","recent-publication",
  ];
  const {page,invalid}=readProtocolCatalogPage(input.pagina);
  return {
    query:readProtocolCatalogTerm(input.q),
    status:statusOptions.includes(input.status as ProtocolOperationalFilter)
      ? input.status as ProtocolOperationalFilter:"all",
    sort:sortOptions.includes(input.ordem as ProtocolCatalogSort)
      ? input.ordem as ProtocolCatalogSort:"name",
    type:input.tipo==="nutrition"||input.tipo==="other"?input.tipo:"all",
    page,invalidPage:invalid,
  };
}
export type CatalogProtocolRow = {id:string;protocol_type:string;created_at:string};
function passesStatus(summary:ProtocolOperationalSummary, status:ProtocolOperationalFilter) {
  switch(status){
    case "with-version":return summary.versionCount>0;
    case "needs-recovery":return summary.versionCount===0;
    case "latest-draft":return summary.latestStatus==="draft";
    case "under-review":return summary.latestStatus==="under-review";
    case "awaiting-publication":return summary.latestStatus==="approved";
    case "latest-published":return summary.latestStatus==="published";
    case "published-with-newer-version":return summary.hasUnpublishedNewerVersion;
    case "never-published":return summary.publicationCount===0;
    default:return true;
  }
}
const emptySummary=(id:string):ProtocolOperationalSummary=>({
  protocolId:id,versionCount:0,latestVersion:null,latestStatus:"missing-version",
  lastPublishedVersion:null,lastPublishedAt:null,publicationCount:0,
  hasUnpublishedNewerVersion:false,
});
function orderDates(a:string|null|undefined,b:string|null|undefined,ascending:boolean){
  const left=chronologicalValue(a),right=chronologicalValue(b);
  if(left===null&&right===null)return 0;
  if(left===null)return 1;
  if(right===null)return -1;
  return ascending?left-right:right-left;
}
/**
 * After the authenticated RLS read, filter and page without dropping rows
 * prior to applying the query. Names and contact information never enter URLs.
 */
export function exploreOperationalProtocolCatalog<T extends CatalogProtocolRow>(
  rows:readonly T[],
  summaries:ReadonlyMap<string,ProtocolOperationalSummary>,
  filters:ProtocolCatalogFilters,
  nameFor:(row:T)=>string,
){
  const normalized=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
  const query=normalized(filters.query);
  const matched=rows.filter(row=>{
    if(filters.type==="nutrition"&&row.protocol_type!=="nutrition")return false;
    if(filters.type==="other"&&row.protocol_type==="nutrition")return false;
    const state=summaries.get(row.id)??emptySummary(row.id);
    if(!passesStatus(state,filters.status))return false;
    return !query || normalized(nameFor(row)).includes(query);
  });
  const sorted=matched.slice().sort((a,b)=>{
    const af=summaries.get(a.id)??emptySummary(a.id);
    const bf=summaries.get(b.id)??emptySummary(b.id);
    if(filters.sort==="newest"||filters.sort==="oldest"){
      const result=orderDates(a.created_at,b.created_at,filters.sort==="oldest");
      if(result)return result;
    }
    if(filters.sort==="recent-publication"){
      const result=orderDates(af.lastPublishedAt,bf.lastPublishedAt,false);
      if(result)return result;
    }
    if(filters.sort==="latest-version"){
      const result=(bf.latestVersion?.version_number??0)-(af.latestVersion?.version_number??0);
      if(result)return result;
    }
    if(filters.sort==="name"){
      const result=nameFor(a).localeCompare(nameFor(b),"pt-BR",{sensitivity:"base"});
      if(result)return result;
    }
    return a.id.localeCompare(b.id);
  });
  const pageCount=Math.max(1,Math.ceil(sorted.length/PROTOCOL_CATALOG_PAGE_SIZE));
  const page=Math.min(filters.page,pageCount);
  const first=(page-1)*PROTOCOL_CATALOG_PAGE_SIZE;
  const overall=[...rows];
  const counts={
    total:overall.length,
    needsRecovery:overall.filter(x=>(summaries.get(x.id)?.versionCount??0)===0).length,
    latestDraft:overall.filter(x=>summaries.get(x.id)?.latestStatus==="draft").length,
    underReview:overall.filter(x=>summaries.get(x.id)?.latestStatus==="under-review").length,
    awaitingPublication:overall.filter(x=>summaries.get(x.id)?.latestStatus==="approved").length,
    latestPublished:overall.filter(x=>summaries.get(x.id)?.latestStatus==="published").length,
    newerUnpublished:overall.filter(x=>summaries.get(x.id)?.hasUnpublishedNewerVersion).length,
  };
  return {
    items:sorted.slice(first,first+PROTOCOL_CATALOG_PAGE_SIZE),
    total:sorted.length,page,pages:pageCount,
    from:sorted.length?first+1:0,to:Math.min(first+PROTOCOL_CATALOG_PAGE_SIZE,sorted.length),
    previous:page>1?page-1:null,next:page<pageCount?page+1:null,
    invalidPage:filters.invalidPage||filters.page>pageCount,
    counts,
  };
}
export function operationalProtocolCatalogHref(base:string,filters:ProtocolCatalogFilters,page:number){
  const q=new URLSearchParams();
  if(filters.query)q.set("q",filters.query);
  if(filters.status!=="all")q.set("status",filters.status);
  if(filters.type!=="all")q.set("tipo",filters.type);
  if(filters.sort!=="name")q.set("ordem",filters.sort);
  if(page>1 && Number.isSafeInteger(page))q.set("pagina",String(page));
  return base+(q.size?"?"+q.toString():"")+"#protocolos-lista";
}
export function operationalProtocolVersionHref(protocolId:string,version:ProtocolVersionFact|null){
  if(!version)return null;
  return "/admin/protocolos/"+encodeURIComponent(protocolId)+"?versao="+
    encodeURIComponent(String(version.version_number))+"#versao-"+version.version_number;
}
/**
 * Factual next action shown to the professional for the exact latest version.
 * This text never executes lifecycle transitions or grants publication rights.
 */
export function protocolNextActionLabel(status: ProtocolOperationalStatus, versionNumber: number) {
  switch (status) {
    case "draft": return `Continuar rascunho · versão ${versionNumber}`;
    case "under-review": return `Revisar versão ${versionNumber}`;
    case "approved": return `Publicar versão ${versionNumber}`;
    case "published": return `Consultar versão ${versionNumber} publicada`;
    case "missing-version": return "Recuperar versão inicial";
  }
}
/**
 * Point to the exact authorized version's next MANUAL step. The URL only
 * navigates; it never changes review, approval, or publication state.
 * The version is expanded by the existing ?versao= selector before scrolling.
 */
export function operationalProtocolNextActionHref(
  protocolId: string,
  version: ProtocolVersionFact | null,
  status: ProtocolOperationalStatus,
) {
  const selected = operationalProtocolVersionHref(protocolId, version);
  if (!selected || !version || status === "missing-version") return null;
  const base = selected.split("#")[0];
  const suffix = status === "draft"
    ? "rascunho-plano-iniciar-" + version.id
    : status === "under-review"
      ? "conferencia-plano-" + version.version_number
      : status === "approved"
        ? "acao-protocolo-" + version.version_number
        : "versao-" + version.version_number;
  return base + "#" + suffix;
}
export function protocolOperationalStatusLabel(status:ProtocolOperationalStatus){
  switch(status){
    case "missing-version":return "Recuperação necessária";
    case "draft":return "Versão mais recente em rascunho";
    case "under-review":return "Aguardando revisão profissional";
    case "approved":return "Aprovado, ainda não publicado";
    case "published":return "Versão mais recente publicada";
  }
}
export function protocolPublicationDate(value:string|null){
  const time=chronologicalValue(value);
  return time===null?"Data indisponível":new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo",
  }).format(new Date(time));
}
