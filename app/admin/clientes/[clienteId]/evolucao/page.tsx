import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { listAccessibleAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-correction-store";
import { applyAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-corrections";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
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
};

function formatAssessmentDate(value: string) {
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

export default async function AdminClientProgressPage({ params }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const assessments = (await listAccessibleAssessmentsForClient(client.id)).filter(
    (assessment) => Boolean(assessment.finalized_at),
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
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Evolução factual por avaliações finalizadas"
        status={<Badge variant="neutral">{assessments.length} avaliação(ões)</Badge>}
      />

      <ClientWorkspaceNav clientId={client.id} />

      <Section
        description="Esta visão reúne apenas valores registrados nas avaliações finalizadas. Variações são diferenças matemáticas entre registros consecutivos da mesma medida e unidade; o sistema não classifica melhora, piora, sucesso ou estagnação."
        title="Evolução"
      >
        {series.length === 0 ? (
          <EmptyState
            description="Finalize avaliações com medidas para formar o histórico longitudinal."
            title="Evolução ainda indisponível"
          />
        ) : (
          <div className={styles.seriesList}>
            {series.map((item) => (
              <Card className={styles.seriesCard} key={item.key + ":" + item.unit}>
                <div className={styles.seriesHeader}>
                  <div>
                    <h2 className={styles.seriesTitle}>{item.label}</h2>
                    <p className={styles.seriesMeta}>Unidade: {item.unit}</p>
                  </div>
                  <Badge variant="neutral">{item.points.length} registro(s)</Badge>
                </div>

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
                          <td>{formatAssessmentDate(point.assessedAt)}</td>
                          <td>
                            {formatNumber(point.value)} {item.unit}
                          </td>
                          <td>
                            {formatDelta(point.deltaFromPrevious)}
                            {point.deltaFromPrevious === null ? "" : " " + item.unit}
                          </td>
                          <td>
                            <Link
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
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
