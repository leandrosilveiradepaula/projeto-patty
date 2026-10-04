import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { formatProfessionalMeasurementLabel } from "@/lib/evaluations/professional-view";
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

export default async function ClientAssessmentsPage() {
  const rows = await listCurrentClientFinalizedAssessmentMeasurements();
  const assessments = new Map<
    string,
    {
      assessedAt: string;
      measurements: typeof rows;
    }
  >();

  for (const row of rows) {
    const current = assessments.get(row.assessment_id) ?? {
      assessedAt: row.assessed_at,
      measurements: [],
    };
    current.measurements.push(row);
    assessments.set(row.assessment_id, current);
  }

  const items = [...assessments.entries()];

  return (
    <>
      <PageHeader
        description="Consulte suas avaliações finalizadas e as medidas registradas pela Patty. Correções de lançamento já aparecem como valor vigente."
        eyebrow="Cliente"
        title="Avaliações e medidas"
      />

      <Section
        description="Os registros aparecem da avaliação mais recente para a mais antiga."
        title="Histórico"
      >
        {items.length === 0 ? (
          <EmptyState
            description="Quando houver uma avaliação finalizada com medidas, ela aparecerá aqui."
            title="Nenhuma avaliação disponível"
          />
        ) : (
          <div className={styles.list}>
            {items.map(([assessmentId, assessment]) => (
              <Card className={styles.card} key={assessmentId}>
                <div className={styles.header}>
                  <h2 className={styles.title}>
                    Avaliação de {formatDate(assessment.assessedAt)}
                  </h2>
                  <Badge variant="neutral">
                    {assessment.measurements.length} medida(s)
                  </Badge>
                </div>
                <dl className={styles.measurements}>
                  {assessment.measurements.map((measurement) => (
                    <div
                      className={styles.measurement}
                      key={
                        measurement.measurement_key +
                        ":" +
                        measurement.unit
                      }
                    >
                      <dt>
                        {formatProfessionalMeasurementLabel(
                          measurement.measurement_key,
                        )}
                      </dt>
                      <dd>
                        {formatNumber(measurement.measurement_value)}{" "}
                        {measurement.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
