import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessibleClient, listAccessibleAssessmentPhotoFiles } from "@/lib/supabase/data-access";
import { loadAccessibleAdminClientProgress } from "@/lib/evaluations/admin-client-progress-loader";
import { selectFinalizedAssessmentPair, compareFinalizedAssessmentPair, assessmentFromSelectedPairHref } from "@/lib/evaluations/assessment-pair-comparison";
import { eligibleAssessmentComparisonPhotos, selectAssessmentPhotoPair } from "@/lib/evaluations/assessment-photo-comparison";
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
 searchParams: Promise<{ referencia?: string | string[]; comparacao?: string | string[]; fotoReferencia?: string | string[]; fotoComparacao?: string | string[] }>;
};
export default async function CompareClientAssessments({params,searchParams}:Props) {
 const {clienteId}=await params;
 const client=await getAccessibleClient(clienteId);
 if(!client) notFound();
 const {assessments,series}=await loadAccessibleAdminClientProgress(client.id);
 const raw=await searchParams;
 const pair=selectFinalizedAssessmentPair(raw,assessments.map(a=>a.id));
 const rows=pair?compareFinalizedAssessmentPair(series,pair.referenceId,pair.comparisonId):[];
 // Both IDs are selected exclusively from finalized records authorized by
 // the current session, and every file association is then fetched under RLS.
 const [referenceFiles, comparisonFiles] = pair
   ? await Promise.all([
       listAccessibleAssessmentPhotoFiles(pair.referenceId),
       listAccessibleAssessmentPhotoFiles(pair.comparisonId),
     ])
   : [[], []];
 const referencePhotos = eligibleAssessmentComparisonPhotos(referenceFiles);
 const comparisonPhotos = eligibleAssessmentComparisonPhotos(comparisonFiles);
 const chosePhotos = raw.fotoReferencia !== undefined || raw.fotoComparacao !== undefined;
 // No image request until the professional explicitly selects TWO files.
 const photoPair = pair && chosePhotos
   ? selectAssessmentPhotoPair(referencePhotos, comparisonPhotos, raw.fotoReferencia, raw.fotoComparacao)
   : null;
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
   {pair?<div id="comparacao-resultados" className={styles.results}>
    <p role="status">Referência: {dateOf(pair.referenceId)} · Comparação: {dateOf(pair.comparisonId)} · {rows.length} medida(s) registrada(s).</p>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Medida</th><th scope="col">Referência</th><th scope="col">Comparação</th><th scope="col">Diferença matemática</th></tr></thead><tbody>
     {rows.map(row=><tr key={row.key+":"+row.unit}><th scope="row">{row.label} ({row.unit})</th><td data-label="Referência">{row.reference===null?"Sem registro":formatFactualMeasurement(row.reference)+" "+row.unit}</td><td data-label="Comparação">{row.comparison===null?"Sem registro":formatFactualMeasurement(row.comparison)+" "+row.unit}</td><td data-label="Diferença">{row.difference===null?"Não comparável":formatFactualDelta(row.difference,row.unit)}</td></tr>)}
    </tbody></table></div>
    {rows.length===0?<p>Não existem medidas em nenhum dos dois registros selecionados.</p>:null}
    <nav className={styles.actions} aria-label="Abrir avaliações comparadas">
      <Link href={assessmentFromSelectedPairHref(pair.referenceId,pair)}>Abrir avaliação de referência</Link>
      <Link href={assessmentFromSelectedPairHref(pair.comparisonId,pair)}>Abrir avaliação de comparação</Link>
    </nav>
    <section className={styles.photoSection} aria-labelledby="comparacao-fotos">
      <h3 id="comparacao-fotos">Comparação visual das fotos privadas</h3>
      <p>Selecione conscientemente uma foto vinculada a cada avaliação. A comparação é apenas visual e não classifica resultados. As imagens permanecem nas rotas privadas, com autorização conferida novamente em cada acesso.</p>
      {referencePhotos.length === 0 || comparisonPhotos.length === 0 ? (
        <p role="status">Não há fotos compatíveis vinculadas às duas avaliações selecionadas. Consulte os arquivos e as avaliações de origem; nenhuma foto de outra avaliação será substituída automaticamente.</p>
      ) : (
        <form className={styles.filters} action={`/admin/clientes/${client.id}/avaliacoes/comparar#comparacao-fotos`} method="get">
          <input type="hidden" name="referencia" value={pair.referenceId} />
          <input type="hidden" name="comparacao" value={pair.comparisonId} />
          <label>Foto da referência
            <select name="fotoReferencia" defaultValue={photoPair?.state === "ready" ? photoPair.earlier.id : ""} required>
              <option value="">Selecione a foto</option>
              {referencePhotos.map(file => <option value={file.id} key={file.id}>{file.original_filename?.trim() || "Foto sem nome"}</option>)}
            </select>
          </label>
          <label>Foto da comparação
            <select name="fotoComparacao" defaultValue={photoPair?.state === "ready" ? photoPair.current.id : ""} required>
              <option value="">Selecione a foto</option>
              {comparisonPhotos.map(file => <option value={file.id} key={file.id}>{file.original_filename?.trim() || "Foto sem nome"}</option>)}
            </select>
          </label>
          <Button type="submit">Comparar fotos escolhidas</Button>
        </form>
      )}
      {photoPair?.state === "invalid" && referencePhotos.length>0 && comparisonPhotos.length>0 ? (
        <Alert title="Fotos incompatíveis" variant="info">Escolha duas fotos diferentes e vinculadas às respectivas avaliações. IDs de outros arquivos são recusados.</Alert>
      ) : null}
      {photoPair?.state === "ready" ? (
        <div className={styles.photoGrid}>
          {[
            { file: photoPair.earlier, label: "Foto da referência", assessedAt: dateOf(pair.referenceId) },
            { file: photoPair.current, label: "Foto da comparação", assessedAt: dateOf(pair.comparisonId) },
          ].map(({ file, label, assessedAt }) => (
            <figure className={styles.photoFrame} key={label}>
              <figcaption><strong>{label}</strong><span>{assessedAt} · {file.original_filename?.trim() || "Foto sem nome"}</span></figcaption>
              <img src={`/admin/fotos/${file.id}`} alt={label + " para comparação visual manual"} loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
            </figure>
          ))}
        </div>
      ) : null}
      <Link href={`/admin/clientes/${client.id}/arquivos`}>Consultar arquivos privados da cliente</Link>
    </section>
   </div>:null}
  </Section>
 </>;
}
