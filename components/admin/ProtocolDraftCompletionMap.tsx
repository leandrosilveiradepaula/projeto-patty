"use client";
import { useState } from "react";
import { searchDraftDirectory, type DraftDirectoryItem, type DraftCompletionIssue } from "@/lib/protocol/draft-navigation";
import styles from "./ProtocolDraftCompletionMap.module.css";

type Navigation={
 ready:boolean;
 issues:DraftCompletionIssue[];
 directory:DraftDirectoryItem[];
 totals:{variants:number;meals:number;doses:number;cycles:number;steps:number};
 unreferencedVariantCount:number;
 repeatedNameCount:number;
 missingCycleTargetCount:number;
 cyclePresent:boolean;
};
export function ProtocolDraftCompletionMap({navigation}:{navigation:Navigation}){
 const [term,setTerm]=useState("");
 const matches=searchDraftDirectory(navigation.directory,term);
 return <section className={styles.root} aria-labelledby="rascunho-pendencias-titulo">
  <h4 id="rascunho-pendencias-titulo">Mapa do rascunho alimentar</h4>
  <p role="status">{navigation.ready?"Estrutura mínima completa para envio à revisão. A aprovação e publicação continuam manuais.":navigation.issues.length+" pendência(s) técnicas de preenchimento para conferir."}</p>
  <dl className={styles.counts}>
   {([["Variações",navigation.totals.variants],["Refeições",navigation.totals.meals],["Doses",navigation.totals.doses],["Ciclos",navigation.totals.cycles],["Etapas",navigation.totals.steps]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>
  {navigation.issues.length>0?<div className={styles.issues}><h5>Pendências por registro</h5>
    <ol>{navigation.issues.map(issue=><li key={issue.key}><a href={issue.href}>{issue.label}</a><p>{issue.detail}</p></li>)}</ol>
   </div>:<p>Não há pendências de estrutura mínima identificadas.</p>}
  {navigation.unreferencedVariantCount>0?<p>{navigation.unreferencedVariantCount} variação(ões) sem referência nos ciclos cadastrados. Informação para conferência, não bloqueio automático.</p>:null}
  {navigation.repeatedNameCount>0?<p>{navigation.repeatedNameCount} nome(s) repetido(s) entre variações. Confira se é intencional.</p>:null}
  {navigation.missingCycleTargetCount>0?<p role="alert">{navigation.missingCycleTargetCount} referência(s) de etapa não encontrada(s) nas variações deste rascunho. Confira os ciclos antes de enviar.</p>:null}
  <details className={styles.directory}><summary>Localizar variações, refeições e ciclos registrados ({navigation.directory.length})</summary>
    <label className={styles.searchLabel}>Buscar registro da estrutura
      <input type="search" value={term} maxLength={120} onChange={e=>setTerm(e.target.value)} placeholder="Nome da refeição, variação ou ciclo" />
    </label>
    <p role="status">{matches.length} de {navigation.directory.length} registro(s) encontrado(s).</p>
    {matches.length===0?<p>Nenhum registro corresponde à busca. Limpe o campo para consultar todos.</p>:null}
    <ul>{matches.map(item=><li key={item.kind+item.id}><a href={item.href}>{item.label}</a><span>{item.description}</span></li>)}</ul>
  </details>
 </section>
}
