import { parseProgressObservationWindow, parseProgressMeasureSelection, sliceFactualSeries, summarizeFactualSeriesWindow, precisionSafeProgressNumber, precisionSafeProgressDelta, factualObservationPlot } from "@/lib/evaluations/client-progress-explorer";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { formatFactualAssessmentDate, formatFactualMeasurement, formatFactualDelta } from "@/lib/evaluations/progress-format";
import { formatAdministrativeAssessmentDate, orderAdministrativeAssessments } from "@/lib/evaluations/administrative-assessment-history";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { listAccessibleAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-correction-store";
import { applyAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-corrections";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
import { summarizeFactualProgressCoverage } from "@/lib/evaluations/progress-journey";
import {
  getAccessibleClient,
  listAccessibleAssessmentMeasurements,
  listAccessibleAssessmentsForClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ serie?: string; janela?: string }>;
};

export default async function AdminClientProgressPage({ params, searchParams }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const assessments = orderAdministrativeAssessments(
    (await listAccessibleAssessmentsForClient(client.id)).filter(
      (assessment) => Boolean(assessment.finalized_at),
    ),
  );

  const assessmentSnapshots = await Promise.all(
    assessments.map(async (assessment) => {
      const rawMeasurements = await listAccessibleAssessmentMeasurements(
        assessment.id,
      );
      const corrections = await listAccessibleAssessmentMeasurementCorrections(
        rawMeasurements.map((measurement) => measurement.id),
      );
      const measurements = applyAssessmentMeasurementCorrections(
        rawMeasurements,
        corrections,
      );

      return {
        assessedAt: assessment.assessed_at,
        id: assessment.id,
        measurements,
      };
    }),
  );

  const series = buildFactualProgressSeries(assessmentSnapshots);
  const coverage = summarizeFactualProgressCoverage(series);
  const rawFilters=await searchParams;
  const observationWindow=parseProgressObservationWindow(rawFilters.janela);
  const measureSelection=parseProgressMeasureSelection(rawFilters.serie,series.length);
  const filteredSeries=(measureSelection.index===null ? series : series.slice(measureSelection.index,measureSelection.index+1))
    .map(item=>sliceFactualSeries(item,observationWindow.value));
  const visibleCoverage=summarizeFactualProgressCoverage(filteredSeries);
  const shownCount=filteredSeries.reduce((sum,item)=>sum+item.points.length,0);
  const filtered=measureSelection.index!==null || observationWindow.value!=="all";

  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Histórico longitudinal de medidas"
        displayName={displayName}
        secondary="Evolução factual por avaliações finalizadas"
        status={<Badge variant="neutral">{assessments.length} avaliação(ões)</Badge>}
      />

      <ClientWorkspaceNav activeArea="evolucao" clientId={client.id} />

      {(observationWindow.invalid || measureSelection.invalid) ? (
        <Alert title="Filtro indisponível" variant="info">Um filtro não é válido. Exibimos somente dados autorizados com a seleção padrão.</Alert>
      ) : null}
      <Section
        description="Esta visão reúne apenas valores registrados nas avaliações finalizadas. Variações são diferenças matemáticas entre registros consecutivos da mesma medida e unidade; o sistema não classifica melhora, piora, sucesso ou estagnação."
        title="Evolução"
      >
        {series.length > 0 ? (
          <form action={`/admin/clientes/${client.id}/evolucao`} method="get" className={styles.explorerFilters}>
            <label>Medida
              <select name="serie" defaultValue={measureSelection.index===null?"all":String(measureSelection.index+1)}>
                <option value="all">Todas as medidas ({series.length})</option>
                {series.map((item,index)=><option value={String(index+1)} key={item.key+":"+item.unit}>{item.label} ({item.unit})</option>)}
              </select>
            </label>
            <label>Observações
              <select name="janela" defaultValue={observationWindow.value}>
                <option value="all">Todo o histórico</option>
                <option value="3">Últimas 3 por medida</option>
                <option value="6">Últimas 6 por medida</option>
                <option value="12">Últimas 12 por medida</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Aplicar filtros</Button>
            {filtered ? <Link href={`/admin/clientes/${client.id}/evolucao`}>Limpar</Link> : null}
          </form>
        ) : null}
        {series.length>0 ? <p role="status" className={styles.progressNote}>Exibindo {shownCount} observação(ões) em {filteredSeries.length} medida(s). Janela por quantidade, não por período clínico.</p> : null}
        {series.length === 0 ? (
          <EmptyState
            description="Não há medidas válidas em avaliações finalizadas para exibir. Consulte ou finalize avaliações no workspace desta cliente."
            title="Evolução ainda indisponível"
            action={<Link href={`/admin/clientes/${client.id}/avaliacoes`}>Abrir avaliações</Link>}
          />
        ) : (
          <>
            {visibleCoverage.comparableSeriesCount === 0 ? (
              <p className={styles.progressNote} role="status">
                Há medidas registradas, mas ainda não existem duas observações comparáveis da mesma medida e unidade. Os valores abaixo são históricos factuais, sem variação calculável.
              </p>
            ) : visibleCoverage.singleObservationSeriesCount > 0 ? (
              <p className={styles.progressNote}>
                Algumas medidas possuem somente um registro; para elas, a variação permanece indisponível até existir outra observação da mesma medida e unidade.
              </p>
            ) : null}
            {filteredSeries.length > 1 ? (
              <nav aria-label="Ir para medida" className={styles.measureNavigation}>
                {filteredSeries.map((item) => {
                  const index = series.findIndex(x=>x.key===item.key&&x.unit===item.unit);
                  return <a href={`#medida-${index}`} key={item.key + ":" + item.unit}>
                    {item.label} ({item.unit})
                  </a>;
                })}
              </nav>
            ) : null}
            <div className={styles.seriesList}>
            {filteredSeries.map((item) => {
              const index=series.findIndex(x=>x.key===item.key&&x.unit===item.unit);
              const summary=summarizeFactualSeriesWindow(item);
              const plot=factualObservationPlot(item.points);
              return <Card className={styles.seriesCard} id={`medida-${index}`} key={item.key + ":" + item.unit}>
                <div className={styles.seriesHeader}>
                  <div>
                    <h2 className={styles.seriesTitle}>{item.label}</h2>
                    <p className={styles.seriesMeta}>Unidade: {item.unit}</p>
                  </div>
                  <Badge variant="neutral">{item.points.length} registro(s)</Badge>
                </div>
                <dl className={styles.factualSummary}>
                  <div><dt>Primeiro valor exibido</dt><dd>{summary.first ? precisionSafeProgressNumber(summary.first.value)+" "+item.unit : "—"}</dd></div>
                  <div><dt>Último valor exibido</dt><dd>{summary.last ? precisionSafeProgressNumber(summary.last.value)+" "+item.unit : "—"}</dd></div>
                  <div><dt>Diferença matemática</dt><dd>{summary.change===null?"—":precisionSafeProgressDelta(summary.change)+" "+item.unit}</dd></div>
                </dl>
                {plot && plot.length>1 ? <div className={styles.plot}>
                  <svg viewBox="0 0 400 120" role="img" aria-label={`Traçado factual de ${item.label}, por ordem das observações. Valores exatos na tabela abaixo.`}>
                    <polyline points={plot.map(point=>`${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                    {plot.map((point,i)=><circle key={item.points[i].assessmentId} cx={point.x} cy={point.y} r="3.5" fill="currentColor"/>)}
                  </svg>
                  <p>Espaçamento por avaliação, não por tempo. Sem metas ou interpretação clínica automática.</p>
                </div> : null}

                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Diferença vs. anterior</th>
                        <th>Avaliação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.points.map((point) => (
                        <tr key={point.assessmentId}>
                          <td data-label="Data">{formatAdministrativeAssessmentDate(point.assessedAt)}</td>
                          <td data-label="Valor">
                            {formatFactualMeasurement(point.value)} {item.unit}
                          </td>
                          <td data-label="Diferença vs. anterior">
                            {formatFactualDelta(point.deltaFromPrevious, item.unit)}
                          </td>
                          <td data-label="Avaliação">
                            <Link
                              aria-label={`Abrir avaliação de ${formatAdministrativeAssessmentDate(point.assessedAt)} para ${item.label}`}
                              className={styles.detailLink}
                              href={"/admin/avaliacoes/" + point.assessmentId}
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>;})}
            </div>
          </>
        )}
      </Section>
    </>
  );
}
