import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
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

  const items = [...assessments.entries()].sort((left, right) =>
    right[1].assessedAt.localeCompare(left[1].assessedAt) || left[0].localeCompare(right[0]),
  );

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
            description="Ainda não há avaliações finalizadas com medidas disponíveis. Quando a Patty publicar esses registros, você poderá consultá-los aqui."
            title="Nenhuma avaliação disponível"
            action={<Link href="/cliente/mais">Ver outras áreas</Link>}
          />
        ) : (
          <>
            {items.length > 1 ? (
              <nav aria-label="Ir para avaliação" className={styles.historyNavigation}>
                {items.map(([id, assessment]) => (
                  <a href={`#avaliacao-${id}`} key={id}>
                    {formatDate(assessment.assessedAt)}
                  </a>
                ))}
              </nav>
            ) : null}
            <div className={styles.actions}>
              <Link className={styles.evolutionLink} href="/cliente/evolucao">
                Ver evolução entre avaliações
              </Link>
            </div>
            <div className={styles.list}>
              {items.map(([assessmentId, assessment], assessmentIndex) => {
                const content = (
                  <Card className={styles.card}>
                    <div className={styles.header}>
                      <h2 className={styles.title}>
                        Avaliação de {formatDate(assessment.assessedAt)}
                      </h2>
                      <div className={styles.badges}>
                        {assessmentIndex === 0 ? (
                          <Badge variant="positive">Mais recente</Badge>
                        ) : null}
                        <Badge variant="neutral">
                          {assessment.measurements.length} medida(s)
                        </Badge>
                      </div>
                    </div>
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
                          <dd>
                            {formatNumber(measurement.measurement_value)}{" "}
                            {measurement.unit}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                );

                if (assessmentIndex === 0) {
                  return <div id={`avaliacao-${assessmentId}`} key={assessmentId}>{content}</div>;
                }

                return (
                  <details className={styles.historyItem} id={`avaliacao-${assessmentId}`} key={assessmentId}>
                    <summary>
                      Avaliação de {formatDate(assessment.assessedAt)} ·{" "}
                      {assessment.measurements.length} medida(s)
                    </summary>
                    <div className={styles.historyContent}>{content}</div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </Section>
    </>
  );
}
