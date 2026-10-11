"use client";
import {useState} from "react";
import Link from "next/link";
import {
  findPublishedHistory,paginatePublishedHistory,adjacentPublishedVersions,
  publishedProtocolDate,publishedNutritionDoseTypes,publishedVariantMatches,publishedMealMatches,
  summarizePublishedNutrition,formatPublishedDoseAmount,labelPublishedDoseType,
} from "@/lib/protocol/client-published-explorer";
import {publishedVariationAnchor,publishedMealAnchor,publishedCycleAnchor,publishedVersionHref,type buildClientPublishedNutritionView} from "@/lib/protocol/client-published-view";
import styles from "./ClientPublishedProtocolExplorer.module.css";

type PublishedView=ReturnType<typeof buildClientPublishedNutritionView>;
type HistoryItem={id:string;versionNumber:number;publishedAt:string;protocolType:string};
export function ClientPublishedHistoryExplorer({publications,selectedId}:{
  publications:HistoryItem[];selectedId:string;
}){
 const [term,setTerm]=useState("");
 const [sort,setSort]=useState("recent");
 const [page,setPage]=useState(1);
 const [expanded,setExpanded]=useState(false);
 const matches=findPublishedHistory(publications,term,sort);
 const pagination=paginatePublishedHistory(matches,String(page));
 const adjacent=adjacentPublishedVersions(publications,selectedId);
 const selectedIndex=publications.findIndex(item=>item.id===selectedId);
 return <div className={styles.panel}>
  <div className={styles.inline}>
   <strong>Publicação {selectedIndex+1} de {publications.length} no histórico autorizado</strong>
   {selectedIndex===0?<span>Plano mais recente</span>:<Link href={publishedVersionHref(publications[0].id)}>Voltar ao plano atual</Link>}
  </div>
  <nav aria-label="Versões vizinhas do protocolo" className={styles.inline}>
   {adjacent.newer?<Link href={publishedVersionHref(adjacent.newer.id)}>Publicação mais recente</Link>:<span>Sem publicação mais recente</span>}
   {adjacent.older?<Link href={publishedVersionHref(adjacent.older.id)}>Publicação anterior</Link>:<span>Sem publicação anterior</span>}
  </nav>
  {publications.length>1?<div>
   <button className={styles.toggle} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} type="button">
    {expanded?"Ocultar pesquisa no histórico":"Pesquisar e navegar por publicações"}
   </button>
   {expanded?<div className={styles.directory}>
    <label>Buscar por versão ou data
     <input type="search" maxLength={120} value={term} onChange={e=>{setTerm(e.target.value);setPage(1)}} placeholder="Ex.: versão 3 ou 11/10/2026"/>
    </label>
    <label>Ordenação
     <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}>
      <option value="recent">Publicações recentes</option><option value="oldest">Publicações antigas</option><option value="version">Número da versão</option>
     </select>
    </label>
    <p role="status">{pagination.total===0?"Nenhuma publicação encontrada.":`${pagination.from}–${pagination.to} de ${pagination.total} publicações encontradas.`}</p>
    {pagination.total===0?<button type="button" onClick={()=>{setTerm("");setSort("recent");setPage(1)}}>Limpar filtros</button>:null}
    <ul>{pagination.items.map(item=><li key={item.id}>
     <Link aria-current={item.id===selectedId?"page":undefined} href={publishedVersionHref(item.id)}>
      Versão {item.versionNumber} · {publishedProtocolDate(item.publishedAt)}
     </Link>{item.id===selectedId?<span>Selecionada</span>:null}
    </li>)}</ul>
    {pagination.pages>1?<nav aria-label="Páginas das publicações" className={styles.inline}>
     <button type="button" disabled={!pagination.previous} onClick={()=>setPage(p=>p-1)}>Anterior</button>
     <span>Página {pagination.page} de {pagination.pages}</span>
     <button type="button" disabled={!pagination.next} onClick={()=>setPage(p=>p+1)}>Próxima</button>
    </nav>:null}
   </div>:null}
  </div>:null}
 </div>;
}

export function ClientPublishedNutritionExplorer({view,publicationId}:{view:PublishedView;publicationId:string}){
 const [query,setQuery]=useState("");
 const [doseType,setDoseType]=useState("all");
 const [showTotals,setShowTotals]=useState(false);
 const types=publishedNutritionDoseTypes(view);
 const matches=publishedVariantMatches(view,query,doseType);
 const mealMatches=publishedMealMatches(view,query,doseType);
 const isFiltering=Boolean(query.trim())||doseType!=="all";
 const summary=summarizePublishedNutrition(view);
 return <div className={styles.panel} aria-label="Explorar variações publicadas">
  <h4>Localizar refeições no plano publicado</h4>
  <p>Esta pesquisa apenas localiza conteúdo. Nenhuma variação ou etapa é escolhida automaticamente para hoje.</p>
  <div className={styles.directory}>
   <label>Pesquisar variação ou refeição
    <input type="search" value={query} onChange={e=>setQuery(e.target.value)} maxLength={120} placeholder="Ex.: café, almoço ou Dia 2"/>
   </label>
   <label>Encontrar variações que contenham doses de
    <select value={doseType} onChange={e=>setDoseType(e.target.value)}>
     <option value="all">Qualquer tipo</option>
     {types.map(type=><option key={type} value={type}>{labelPublishedDoseType(type)}</option>)}
    </select>
   </label>
  </div>
  <p role="status">{matches.length} de {view.variants.length} variações encontradas.</p>
  {isFiltering?<button type="button" onClick={()=>{setQuery("");setDoseType("all")}}>Limpar pesquisa</button>:null}
  <ul className={styles.results}>{matches.map(v=><li key={v.id}>
   <a href={"#"+publishedVariationAnchor(publicationId,v.id)}>{v.label}</a>
   <span>{v.meals} refeição(ões)</span>
  </li>)}</ul>
  {isFiltering ? <div className={styles.directory}>
    <strong>Refeições que correspondem aos filtros</strong>
    <p role="status">{mealMatches.length} refeição(ões) encontradas nos registros publicados.</p>
    {mealMatches.length === 0 ? <p>Não há refeições com a combinação de pesquisa e doses selecionada.</p> : null}
    <ul>{mealMatches.map(meal => <li key={meal.id}>
      <a href={"#"+publishedMealAnchor(publicationId,meal.id)}>{meal.variantLabel} · {meal.label}</a>
    </li>)}</ul>
  </div> : null}
  {view.cycles.length > 1 ? <nav aria-label="Ir para ciclo publicado" className={styles.inline}>
    {view.cycles.map((cycle,index) => <a key={cycle.id} href={"#"+publishedCycleAnchor(publicationId,cycle.id)}>Ciclo {index+1}</a>)}
  </nav> : null}
  {summary?<div>
   <button type="button" aria-expanded={showTotals} className={styles.toggle} onClick={()=>setShowTotals(x=>!x)}>
    {showTotals?"Ocultar contagem registrada":"Conferir contagem das doses registradas"}
   </button>
   {showTotals?<div className={styles.totals}>
    <p>Contagem factual de todas as variações publicadas juntas. <strong>Não é uma meta diária</strong> nem determina qual variação seguir.</p>
    <dl>{summary.doses.map(d=><div key={d.doseType}>
     <dt>{labelPublishedDoseType(d.doseType)}</dt><dd>{formatPublishedDoseAmount(d.quantity)} dose(s) em {d.allocations} lançamento(s)</dd>
    </div>)}</dl>
    <p>{summary.allocations} lançamento(s) de doses em {summary.mealCount} refeições de {summary.variantCount} variações.</p>
    {summary.invalidAllocations>0?<p role="alert">{summary.invalidAllocations} lançamento(s) com quantidade inválida foram excluídos da soma. Consulte a Patty.</p>:null}
    <details><summary>Contagem por variação</summary>
      <ul>{summary.variants.map(v=><li key={v.id}><strong>{v.label}</strong>
       <p>{v.meals} refeição(ões), {v.allocations} lançamento(s).</p>
       <ul>{v.doses.map(d=><li key={d.doseType}>{labelPublishedDoseType(d.doseType)}: {formatPublishedDoseAmount(d.quantity)} dose(s)</li>)}</ul>
      </li>)}</ul>
    </details>
   </div>:null}
  </div>:null}
 </div>;
}
