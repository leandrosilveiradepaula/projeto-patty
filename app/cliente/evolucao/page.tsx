import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
import { assembleClientFinalizedAssessments, parseProgressObservationWindow, parseProgressMeasureSelection, sliceFactualSeries, summarizeFactualSeriesWindow, precisionSafeProgressNumber, precisionSafeProgressDelta, factualObservationPlot, progressionMeasureHref } from "@/lib/evaluations/client-progress-explorer";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { summarizeFactualProgressCoverage } from "@/lib/evaluations/progress-journey";
import { listCurrentClientFinalizedAssessmentMeasurements } from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatDate(value: string) {
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

function formatDelta(value: number | null) {
  if (value === null) return "—";
  const prefix = value > 0 ? "+" : "";
  return prefix + formatNumber(value);
}

export default async function ClientProgressPage({ searchParams }: {
  searchParams: Promise<{ serie?: string; janela?: string }>;
}) {
  const rows = await listCurrentClientFinalizedAssessmentMeasurements();
  const fullSeries = buildFactualProgressSeries(assembleClientFinalizedAssessments(rows));
  const { serie, janela } = await searchParams;
  const observationWindow = parseProgressObservationWindow(janela);
  const measureSelection = parseProgressMeasureSelection(serie, fullSeries.length);
  const series = (measureSelection.index === null
    ? fullSeries : fullSeries.slice(measureSelection.index, measureSelection.index + 1))
    .map((item) => sliceFactualSeries(item, observationWindow.value));
  const coverage = summarizeFactualProgressCoverage(series);
  const allCoverage = summarizeFactualProgressCoverage(fullSeries);
  const filtered = observationWindow.value !== "all" || measureSelection.index !== null;
  const totalShown = series.reduce((sum, item) => sum + item.points.length, 0);

  return (
    <>
      <PageHeader
        description="Veja a variação numérica das suas medidas entre avaliações finalizadas. O aplicativo não classifica melhora, piora, sucesso ou estagnação."
        eyebrow="Cliente"
        title="Evolução"
      />

      {(observationWindow.invalid || measureSelection.invalid) ? (
        <Alert title="Filtro indisponível" variant="info" live="polite">
          Um parâmetro da consulta não é válido. Exibimos somente os dados autorizados com o filtro padrão.
        </Alert>
      ) : null}
      <Section
        id="historico-medidas"
        action={
          <Link className={styles.assessmentsLink} href="/cliente/avaliacoes">
            Ver avaliações
          </Link>
        }
        description="Cada linha compara apenas a mesma medida na mesma unidade."
        title="Histórico de medidas"
      >
        {fullSeries.length > 0 ? (
          <div className={styles.filterPanel}>
            <form action="/cliente/evolucao" method="get" className={styles.filters}>
              <label>
                <span>Medida</span>
                <select name="serie" defaultValue={measureSelection.index === null ? "all" : String(measureSelection.index + 1)}>
                  <option value="all">Todas as medidas ({fullSeries.length})</option>
                  {fullSeries.map((item, index) => (
                    <option key={item.key + ":" + item.unit} value={String(index + 1)}>
                      {item.label} ({item.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Observações</span>
                <select name="janela" defaultValue={observationWindow.value}>
                  <option value="all">Todo o histórico</option>
                  <option value="3">Últimas 3 por medida</option>
                  <option value="6">Últimas 6 por medida</option>
                  <option value="12">Últimas 12 por medida</option>
                </select>
              </label>
              <Button type="submit" variant="secondary">Aplicar filtros</Button>
              {filtered ? <Link href="/cliente/evolucao#historico-medidas">Limpar filtros</Link> : null}
            </form>
            <p className={styles.progressNote} role="status">
              Exibindo {totalShown} observação(ões) em {series.length} medida(s), de {allCoverage.seriesCount} disponíveis.
              A seleção é de quantidade de observações, não de meses ou de uma janela clínica.
            </p>
          </div>
        ) : null}
        {series.length === 0 ? (
          <EmptyState
            description="Não há medidas válidas de avaliações finalizadas para exibir. Você pode consultar os registros já disponíveis em Avaliações."
            title="Evolução ainda indisponível"
            action={<Link href="/cliente/avaliacoes">Consultar avaliações</Link>}
          />
        ) : (
          <>
            {coverage.comparableSeriesCount === 0 ? (
              <p className={styles.progressNote} role="status">
                Há medidas registradas, mas ainda não existem duas observações comparáveis da mesma medida e unidade. Os valores abaixo são históricos factuais, sem variação calculável.
              </p>
            ) : coverage.singleObservationSeriesCount > 0 ? (
              <p className={styles.progressNote}>
                Algumas medidas possuem somente um registro; para elas, a variação permanece indisponível até existir outra observação da mesma medida e unidade.
              </p>
            ) : null}
            {series.length > 1 ? (
              <nav aria-label="Ir para medida" className={styles.measureNavigation}>
                {series.map((item) => {
                  const originalIndex = fullSeries.findIndex((v) => v.key === item.key && v.unit === item.unit);
                  return <a href={progressionMeasureHref(originalIndex + 1, observationWindow.value)} key={item.key + ":" + item.unit}>
                    {item.label} ({item.unit})
                  </a>;
                })}
              </nav>
            ) : null}
            <div className={styles.seriesList}>
            {series.map((item) => {
              const originalIndex = fullSeries.findIndex((v) => v.key === item.key && v.unit === item.unit);
              const summary = summarizeFactualSeriesWindow(item);
              const plot = factualObservationPlot(item.points);
              return (
              <Card className={styles.seriesCard} id={`medida-${originalIndex}`} key={item.key + ":" + item.unit}>
                <div className={styles.header}>
                  <div>
                    <h2 className={styles.title}>{item.label}</h2>
                    <p className={styles.meta}>Unidade: {item.unit}</p>
                  </div>
                  <div className={styles.headerBadges}>
                    <Badge variant="neutral">{item.points.length} registro(s)</Badge>
                    {item.points.length > 0 ? (
                      <Badge variant="neutral">
                        Atual: {formatNumber(item.points[item.points.length - 1].value)} {item.unit}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <dl className={styles.summaryMetrics}>
                  <div><dt>Primeira observação exibida</dt><dd>{summary.first ? precisionSafeProgressNumber(summary.first.value) + " " + item.unit : "—"}</dd></div>
                  <div><dt>Última observação exibida</dt><dd>{summary.last ? precisionSafeProgressNumber(summary.last.value) + " " + item.unit : "—"}</dd></div>
                  <div><dt>Diferença matemática</dt><dd>{precisionSafeProgressDelta(summary.change)}{summary.change === null ? "" : " " + item.unit}</dd></div>
                </dl>
                {plot && plot.length > 1 ? (
                  <div className={styles.plotPanel}>
                    <svg viewBox="0 0 400 120" role="img" aria-label={`Traçado ilustrativo de ${item.label}: ${plot.length} observações em ordem, com escala vertical ajustada aos valores exibidos. Datas e quantidades exatas estão na tabela abaixo.`}>
                      <polyline points={plot.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      {plot.map((point, i) => <circle key={item.points[i].assessmentId} cx={point.x} cy={point.y} r="3.5" fill="currentColor" />)}
                    </svg>
                    <p className={styles.meta}>Visualização factual: pontos igualmente espaçados por avaliação, sem escala de tempo. A escala vertical é ajustada a esta medida; não indica meta, melhora ou piora.</p>
                  </div>
                ) : null}
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Variação vs. anterior</th>
                        <th>Avaliação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.points.map((point) => (
                        <tr key={point.assessmentId}>
                          <td data-label="Data">{formatDate(point.assessedAt)}</td>
                          <td data-label="Valor">
                            {precisionSafeProgressNumber(point.value)} {item.unit}
                          </td>
                          <td data-label="Variação vs. anterior">
                            {precisionSafeProgressDelta(point.deltaFromPrevious)}
                            {point.deltaFromPrevious === null
                              ? ""
                              : " " + item.unit}
                          </td>
                          <td data-label="Avaliação">
                            <Link
                              aria-label={`Abrir avaliação de ${formatDate(point.assessedAt)} para ${item.label}`}
                              className={styles.assessmentDetailLink}
                              href={`/cliente/avaliacoes#avaliacao-${point.assessmentId}`}
                            >
                              Ir à avaliação
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              );
            })}
            </div>
          </>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["assessments","protocol","index"]} />
    </>
  );
}
