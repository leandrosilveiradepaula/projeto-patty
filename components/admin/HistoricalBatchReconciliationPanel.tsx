import "server-only";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { getHistoricalBatchReconciliation } from "@/lib/imports/historical-batch-report-server";
import type { HistoricalBatchDomain, HistoricalBatchStatus } from "@/lib/imports/historical-batch-reconciliation";

const domainLabels:Record<HistoricalBatchDomain,string>={
  anamnesis:"Anamnese histórica",assessments:"Avaliações / medidas",
  registration:"Cadastro Histórico",photos:"Fotos",
};
const statusLabels:Record<HistoricalBatchStatus,string>={
  saved_private:"Guardado em privado",not_saved:"Sem recibo — aplicabilidade a conferir",
  not_applicable:"Não se aplica",blocked:"Fonte bloqueada",
  conflict:"Divergência — bloquear",unavailable:"Consulta indisponível",
};
const domains=["anamnesis","assessments","registration","photos"] as const;
const short=(v:string|null)=>v?v.slice(0,12)+"…":"Sem assinatura";
export async function HistoricalBatchReconciliationPanel({batchId}:{batchId:string}){
  const report=await getHistoricalBatchReconciliation(batchId);
  if(!report)return <Alert variant="warning">
    Reconciliação integral indisponível: lote ausente, consulta bloqueada ou inventário truncado.
    Não interprete a ausência do relatório como zero pendências.
  </Alert>;
  const unresolved=report.sources.filter(s=>
    s.domains[s.kind==="photo"?"photos":"anamnesis"]!=="saved_private"
    || domains.some(d=>s.domains[d]==="conflict"||s.domains[d]==="unavailable"));
  return <div style={{display:"grid",gap:"1rem",minWidth:0}}>
    <Alert variant={report.consultation_complete?"info":"warning"}>
      {report.consultation_complete
        ?"Consultas de metadados completas. Isso não significa carga concluída: cada domínio precisa de revisão humana de aplicabilidade, identidade e conteúdo."
        :"Reconciliação INCOMPLETA: contagem divergente, fonte inválida, recibo órfão ou consulta de domínio ausente. Não declarar nenhuma carga concluída."}
    </Alert>
    <p>Declarados: <strong>{report.declared_count}</strong>; inventariados: <strong>{report.observed_count}</strong>.
      Excel: <strong>{report.source_counts.xlsx}</strong>; fotos: <strong>{report.source_counts.photos}</strong>;
      fontes bloqueadas: <strong>{report.source_counts.blocked}</strong>;
      divergências: <strong>{report.source_counts.conflicts}</strong>;
      sem recibo em qualquer domínio: <strong>{report.source_counts.without_any_receipt}</strong>.</p>
    <div style={{overflowX:"auto"}}><table>
      <thead><tr><th scope="col">Domínio</th><th scope="col">Consulta</th><th scope="col">Recibos órfãos ou de tipo incorreto</th></tr></thead>
      <tbody>{domains.map(d=><tr key={d}>
        <td>{domainLabels[d]}</td>
        <td>{report.unavailable_domains.includes(d)?"Indisponível":"Disponível — ver fontes"}</td>
        <td>{report.orphan_receipt_count[d]===null?"Não verificável":report.orphan_receipt_count[d]}</td>
      </tr>)}</tbody>
    </table></div>
    <h3>Cobertura por família de Excel</h3>
    <p>Assinaturas iguais agrupam somente o formato, não confirmam cliente ou semântica. Um Excel pode conter diversos domínios ou nenhum deles.</p>
    <div style={{overflowX:"auto"}}><table>
      <thead><tr><th>Assinatura</th><th>Excel</th><th>Anamnese guardada</th>
        <th>Avaliações guardadas</th><th>Cadastro Histórico guardado</th><th>Sem recibo</th></tr></thead>
      <tbody>{report.families.map((f,i)=><tr key={f.layout_signature_sha256??`unidentified-${i}`}>
        <td><code>{short(f.layout_signature_sha256)}</code></td>
        <td>{f.source_count}</td><td>{f.anamnesis_saved}</td>
        <td>{f.assessments_saved}</td><td>{f.registration_saved}</td>
        <td>{f.without_receipts}</td>
      </tr>)}</tbody>
    </table></div>
    <div>
      <Link href={`/api/admin/historical-initial-load/reconciliation?batch=${batchId}`}>
        Exportar reconciliação CSV — apenas IDs opacos, hashes e estados
      </Link>
      <p>O CSV é um relatório de triagem, não comprovação de importação ou autorização de publicação.</p>
    </div>
    <h3>Pendências e divergências (primeiras 40)</h3>
    <p>{unresolved.length} fontes requerem conferência na amostra dos metadados. Visualização resumida; CSV inclui todas as {report.observed_count} fontes.</p>
    <div style={{overflowX:"auto"}}><table>
      <thead><tr><th>Origem</th><th>Tipo</th><th>Vínculo proposto</th><th>Inventário</th>
        <th>Anamnese</th><th>Avaliações</th><th>Cadastro</th><th>Fotos</th></tr></thead>
      <tbody>{unresolved.slice(0,40).map(s=><tr key={s.source_id}>
        <td><code>{s.source_id}</code></td><td>{s.kind==="photo"?"Foto":"Excel"}</td>
        <td><code>{s.client_id??"Sem vínculo"}</code></td>
        <td>{s.reason??s.state}</td>
        {domains.map(d=><td key={d}>{statusLabels[s.domains[d]]}</td>)}
      </tr>)}</tbody>
    </table></div>
  </div>;
}
