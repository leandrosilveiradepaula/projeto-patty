import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
import { clientAssessmentPairHref } from "@/lib/evaluations/client-assessment-pair-navigation";
import { assessmentMeasureHistoryHref, assessmentProgressReturn } from "@/lib/evaluations/assessment-progress-navigation";
import { readAssessmentExplorer, exploreAssessmentMeasures, assessmentExplorerHref } from "@/lib/evaluations/client-assessment-explorer";
import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientAssessmentHistoryDisclosure } from "./ClientAssessmentHistoryDisclosure";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import { formatProfessionalMeasurementLabel } from "@/lib/evaluations/professional-view";
import { completeClientAssessmentHistory } from "@/lib/evaluations/client-assessment-history";
import { getCurrentClient, listCurrentClientFinalizedAssessmentHistory } from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ClientAssessmentsPage({searchParams}:{searchParams:Promise<{medidas?:string;pagina?:string;avaliacao?:string;origemSerie?:string;origemJanela?:string}>}) {
  const client = await getCurrentClient();
  if (!client) return <EmptyState title="Cadastro não vinculado" description="Esta conta ainda não está vinculada a um cadastro de cliente." />;
  const assessmentHistory = await listCurrentClientFinalizedAssessmentHistory();
  const items = completeClientAssessmentHistory(assessmentHistory.headers, assessmentHistory.measurements);
  const ownFinalizedIds = items.map(item => item.id);
  const latestComparisonHref = items.length >= 2
    ? clientAssessmentPairHref({
        referencia: items[1].id,
        comparacao: items[0].id,
      }, ownFinalizedIds)
    : null;
  const raw=await searchParams;
  const progressSeries = buildFactualProgressSeries(items);
  const options=readAssessmentExplorer(raw);
  const exact=authorizedExactRecordPage(items,raw.avaliacao,12);
  if(exact!==null){options.measure="all";options.page=exact;}
  const progressReturn = exact === null ? null : assessmentProgressReturn(raw, progressSeries);
  const history=exploreAssessmentMeasures(items,options);

  return (
    <>
      <PageHeader
        description="Consulte suas avaliações finalizadas e as medidas registradas pela Patty. Correções de lançamento já aparecem como valor vigente."
        eyebrow="Cliente"
        title="Avaliações e medidas"
      />

      {!assessmentHistory.complete ? (
        <Alert variant="warning" live="polite" title="Histórico de avaliações parcialmente disponível">
          Algumas avaliações finalizadas sem medidas podem não aparecer neste momento. O sistema está exibindo apenas os registros de medidas acessíveis, sem concluir que não existem outras avaliações. Nenhum dado foi alterado.
        </Alert>
      ) : null}

      <Section
        id="historico-avaliacoes"
        description="Os registros aparecem da avaliação mais recente para a mais antiga."
        title="Histórico"
      >
        {progressReturn ? (
          <nav aria-label="Retornar à evolução consultada" className={styles.returnPanel}>
            <p>Você veio da evolução de <strong>{progressReturn.label}</strong>.</p>
            <Link href={progressReturn.href}>Voltar à mesma medida e observações</Link>
          </nav>
        ) : null}
        {items.length>0 ? <form method="get" action="/cliente/avaliacoes" className={styles.explorerFilters}>
          <label>Medidas<select name="medidas" defaultValue={options.measure}>
            <option value="all">Todas as avaliações</option>
            <option value="with">Com medidas disponíveis</option>
            <option value="without">Sem medidas disponíveis</option>
          </select></label>
          <button type="submit">Filtrar avaliações</button>
          {options.measure!=="all"?<Link href="/cliente/avaliacoes">Limpar</Link>:null}
        </form>:null}
        {options.invalid||options.page>history.pages?<p role="status">Página ou filtro indisponível; exibindo somente suas avaliações autorizadas.</p>:null}
        {items.length === 0 ? (
          <EmptyState
            description={assessmentHistory.complete ? "Ainda não há avaliações finalizadas disponíveis. Consulte esta área quando houver novas avaliações concluídas pela Patty." : "Nenhuma avaliação com medidas está disponível nesta consulta parcial. Podem existir avaliações finalizadas sem medidas que ainda não aparecem."}
            title="Nenhuma avaliação disponível"
            action={<Link href="/cliente/mais">Ver outras áreas</Link>}
          />
        ) : history.total === 0 ? (
          <EmptyState title="Nenhuma avaliação encontrada" description="Os filtros não correspondem às suas avaliações finalizadas." action={<Link href="/cliente/avaliacoes">Ver todas</Link>} />
        ) : (
          <>
            <p role="status">Exibindo {history.from}–{history.to} de {history.total} avaliações encontradas.</p>
            {history.items.length > 1 ? (
              <nav aria-label="Ir para avaliação" className={styles.historyNavigation}>
                {history.items.map((assessment, index) => (
                  <a href={`#avaliacao-${assessment.id}`} key={assessment.id}>
                    Avaliação {history.from + index}: {formatDate(assessment.assessedAt)}
                  </a>
                ))}
              </nav>
            ) : null}
            <nav className={styles.actions} aria-label="Consultar evolução das avaliações">
              <Link className={styles.evolutionLink} href="/cliente/evolucao">
                Ver evolução entre avaliações
              </Link>
              {latestComparisonHref ? (
                <Link className={styles.evolutionLink} href={latestComparisonHref}>
                  Comparar duas avaliações
                </Link>
              ) : null}
            </nav>
            <div className={styles.list}>
              {history.items.map((assessment, localIndex) => {
                const assessmentIndex=items.findIndex(item=>item.id===assessment.id);
                const assessmentId = assessment.id;
                const comparisonPartner = assessmentIndex === 0 ? items[1] : items[0];
                const assessmentComparisonHref = comparisonPartner
                  ? clientAssessmentPairHref({
                      referencia: assessmentIndex === 0 ? comparisonPartner.id : assessment.id,
                      comparacao: assessmentIndex === 0 ? assessment.id : comparisonPartner.id,
                    }, ownFinalizedIds)
                  : null;
                const content = (
                  <Card className={styles.card}>
                    <div className={styles.header}>
                      <h2 className={styles.title}>
                        Avaliação de {formatDate(assessment.assessedAt)}
                      </h2>
                      <div className={styles.badges}>
                        {assessmentIndex === 0 ? (
                          <Badge variant="neutral">Mais recente</Badge>
                        ) : null}
                        <Badge variant="neutral">
                          {assessment.measurements.length} medida(s)
                        </Badge>
                      </div>
                    </div>
                    {assessment.measurements.length === 0 ? (
                      <p role="status">Avaliação finalizada, sem medidas disponíveis para consulta.</p>
                    ) : null}
                    <dl className={styles.measurements}>
                      {assessment.measurements.map((measurement) => (
                        <div
                          className={styles.measurement}
                          key={measurement.measurement_key + ":" + measurement.unit}
                        >
                          <dt>
                            {formatProfessionalMeasurementLabel(
                              measurement.measurement_key,
                            )}
                          </dt>
                          <dd className={styles.measureValue}>
                            <span>{formatNumber(measurement.measurement_value)} {measurement.unit}</span>
                            {assessmentMeasureHistoryHref(progressSeries, measurement) ? (
                              <Link
                                aria-label={`Ver histórico de ${formatProfessionalMeasurementLabel(measurement.measurement_key)} (${measurement.unit})`}
                                className={styles.measureLink}
                                href={assessmentMeasureHistoryHref(progressSeries, measurement)!}
                              >
                                Ver histórico da medida
                              </Link>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {assessmentComparisonHref ? (
                      <Link className={styles.assessmentCompareLink} href={assessmentComparisonHref}>
                        {assessmentIndex === 0
                          ? "Comparar com a avaliação anterior"
                          : "Comparar com a avaliação mais recente"}
                      </Link>
                    ) : null}
                  </Card>
                );

                if (assessmentIndex === 0) {
                  return <div id={`avaliacao-${assessmentId}`} key={assessmentId}>{content}</div>;
                }

                return (
                  <ClientAssessmentHistoryDisclosure
                    className={styles.historyItem}
                    id={`avaliacao-${assessmentId}`}
                    key={assessmentId}
                    summary={`Avaliação ${assessmentIndex + 1} de ${items.length} · ${formatDate(assessment.assessedAt)} · ${assessment.measurements.length} medida(s)`}
                  >
                    <div className={styles.historyContent}>{content}</div>
                  </ClientAssessmentHistoryDisclosure>
                );
              })}
            </div>
            {history.pages>1?<nav className={styles.explorerPages} aria-label="Páginas do histórico de avaliações">
              <span>Página {history.page} de {history.pages}</span>
              {history.page>1?<Link href={assessmentExplorerHref(options.measure,history.page-1)}>Anterior</Link>:null}
              {history.page<history.pages?<Link href={assessmentExplorerHref(options.measure,history.page+1)}>Próxima</Link>:null}
            </nav>:null}
          </>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["progress","protocol","index"]} />
    </>
  );
}
