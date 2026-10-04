import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { buildFactualProgressSeries } from "@/lib/evaluations/progress-view";
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

export default async function ClientProgressPage() {
  const rows = await listCurrentClientFinalizedAssessmentMeasurements();
  const assessments = new Map<
    string,
    {
      assessedAt: string;
      id: string;
      measurements: Array<{
        measurement_key: string;
        measurement_value: number;
        unit: string;
      }>;
    }
  >();

  for (const row of rows) {
    const current = assessments.get(row.assessment_id) ?? {
      assessedAt: row.assessed_at,
      id: row.assessment_id,
      measurements: [],
    };
    current.measurements.push({
      measurement_key: row.measurement_key,
      measurement_value: row.measurement_value,
      unit: row.unit,
    });
    assessments.set(row.assessment_id, current);
  }

  const series = buildFactualProgressSeries([...assessments.values()]);

  return (
    <>
      <PageHeader
        description="Veja a variação numérica das suas medidas entre avaliações finalizadas. O aplicativo não classifica melhora, piora, sucesso ou estagnação."
        eyebrow="Cliente"
        title="Evolução"
      />

      <Section
        description="Cada linha compara apenas a mesma medida na mesma unidade."
        title="Histórico de medidas"
      >
        {series.length === 0 ? (
          <EmptyState
            description="São necessárias avaliações finalizadas com medidas para formar sua evolução."
            title="Evolução ainda indisponível"
          />
        ) : (
          <div className={styles.seriesList}>
            {series.map((item) => (
              <Card className={styles.seriesCard} key={item.key + ":" + item.unit}>
                <div className={styles.header}>
                  <div>
                    <h2 className={styles.title}>{item.label}</h2>
                    <p className={styles.meta}>Unidade: {item.unit}</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {item.points.map((point) => (
                        <tr key={point.assessmentId}>
                          <td>{formatDate(point.assessedAt)}</td>
                          <td>
                            {formatNumber(point.value)} {item.unit}
                          </td>
                          <td>
                            {formatDelta(point.deltaFromPrevious)}
                            {point.deltaFromPrevious === null
                              ? ""
                              : " " + item.unit}
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
