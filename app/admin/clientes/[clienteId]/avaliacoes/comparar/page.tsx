import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessibleClient } from "@/lib/supabase/data-access";
import { loadAccessibleAdminClientProgress } from "@/lib/evaluations/admin-client-progress-loader";
import { selectFinalizedAssessmentPair, compareFinalizedAssessmentPair } from "@/lib/evaluations/assessment-pair-comparison";
import { formatAdministrativeAssessmentDate } from "@/lib/evaluations/administrative-assessment-history";
import { formatFactualMeasurement, formatFactualDelta } from "@/lib/evaluations/progress-format";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

type Props = {
 params: Promise<{ clienteId: string }>;
 searchParams: Promise<{ referencia?: string | string[]; comparacao?: string | string[] }>;
};
export default async function CompareClientAssessments({params,searchParams}:Props) {
 const {clienteId}=await params;
 const client=await getAccessibleClient(clienteId);
 if(!client) notFound();
 const {assessments,series}=await loadAccessibleAdminClientProgress(client.id);
 const raw=await searchParams;
 const pair=selectFinalizedAssessmentPair(raw,assessments.map(a=>a.id));
 const rows=pair?compareFinalizedAssessmentPair(series,pair.referenceId,pair.comparisonId):[];
 const dateOf=(id:string)=>formatAdministrativeAssessmentDate(assessments.find(a=>a.id===id)?.assessed_at??"");
 const options=assessments.map(a=>({id:a.id,label:formatAdministrativeAssessmentDate(a.assessed_at)+" · "+a.id.slice(0,8)}));
 return <>
  <ClientWorkspaceHeader displayName={client.full_name?.trim()||client.profiles?.display_name?.trim()} meta="Duas avaliações finalizadas" secondary="Comparação factual manual" status={<Badge variant="neutral">{assessments.length} finalizada(s)</Badge>}/>
  <ClientWorkspaceNav activeArea="avaliacoes" clientId={client.id}/>
  <nav aria-label="Continuar atendimento"><Link href={`/admin/clientes/${client.id}/avaliacoes#historico-finalizado`}>Voltar ao histórico</Link>{" · "}<Link href={`/admin/clientes/${client.id}/evolucao`}>Evolução completa</Link></nav>
  <Section title="Comparar duas avaliações" description="Escolha livremente duas avaliações finalizadas desta cliente. A diferença é comparação − referência, sem interpretação clínica ou alteração de protocolo.">
   <form action={`/admin/clientes/${client.id}/avaliacoes/comparar`} method="get" className={styles.filters}>
    <label>Referência<select name="referencia" defaultValue={pair?.referenceId??""} required><option value="">Selecione</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select></label>
    <label>Comparação<select name="comparacao" defaultValue={pair?.comparisonId??""} required><option value="">Selecione</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select></label>
    <Button type="submit" disabled={assessments.length<2}>Comparar avaliações</Button>
   </form>
   {assessments.length<2?<Alert variant="info" title="Histórico insuficiente">São necessárias duas avaliações finalizadas para esta comparação.</Alert>:null}
   {(raw.referencia||raw.comparacao)&&!pair?<Alert variant="info" title="Seleção indisponível">Escolha duas avaliações distintas e acessíveis. Nenhum dado de outra cliente foi carregado.</Alert>:null}
   {pair?<div>
    <p role="status">Referência: {dateOf(pair.referenceId)} · Comparação: {dateOf(pair.comparisonId)} · {rows.length} medida(s) registrada(s).</p>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Medida</th><th scope="col">Referência</th><th scope="col">Comparação</th><th scope="col">Diferença matemática</th></tr></thead><tbody>
     {rows.map(row=><tr key={row.key+":"+row.unit}><th scope="row">{row.label} ({row.unit})</th><td data-label="Referência">{row.reference===null?"Sem registro":formatFactualMeasurement(row.reference)+" "+row.unit}</td><td data-label="Comparação">{row.comparison===null?"Sem registro":formatFactualMeasurement(row.comparison)+" "+row.unit}</td><td data-label="Diferença">{row.difference===null?"Não comparável":formatFactualDelta(row.difference,row.unit)}</td></tr>)}
    </tbody></table></div>
    {rows.length===0?<p>Não existem medidas em nenhum dos dois registros selecionados.</p>:null}
    <nav className={styles.actions} aria-label="Abrir avaliações comparadas">
      <Link href={`/admin/avaliacoes/${pair.referenceId}`}>Abrir avaliação de referência</Link>
      <Link href={`/admin/avaliacoes/${pair.comparisonId}`}>Abrir avaliação de comparação</Link>
    </nav>
   </div>:null}
  </Section>
 </>;
}
