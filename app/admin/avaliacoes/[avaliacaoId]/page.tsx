import { EvaluationMeasureList } from "@/components/admin/EvaluationMeasureList";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientAssessment,
  listAccessibleAssessmentMeasurements,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminAvaliacaoDetailPageProps = {
  params: Promise<{
    avaliacaoId: string;
  }>;
};

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMeasurementValue(value: number) {
  return String(value);
}

export default async function AdminAvaliacaoDetailPage({
  params,
}: AdminAvaliacaoDetailPageProps) {
  const { avaliacaoId } = await params;
  const assessment = await getAccessibleClientAssessment(avaliacaoId);

  if (!assessment) {
    notFound();
  }

  const measurements = await listAccessibleAssessmentMeasurements(assessment.id);
  const displayName = assessment.clients?.profiles?.display_name?.trim();

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/avaliacoes">
            Voltar ao histórico
          </Link>
        }
        description="Leitura administrativa de uma avaliação acessível conforme as atribuições ativas."
        eyebrow="Admin"
        title="Detalhe da avaliação"
      />
      <section className={styles.summaryHeader} aria-labelledby="evaluation-summary-title">
        <div className={styles.summaryContent}>
          <h2 className={styles.summaryTitle} id="evaluation-summary-title">
            {displayName || "Cliente sem nome informado"}
          </h2>
          <dl className={styles.summaryDetails}>
            <div className={styles.summaryDetail}>
              <dt>Data</dt>
              <dd>{formatAssessmentDate(assessment.assessed_at)}</dd>
            </div>
            <div className={styles.summaryDetail}>
              <dt>Identificador</dt>
              <dd>{assessment.id}</dd>
            </div>
          </dl>
        </div>
        <Badge variant="neutral">Registrada</Badge>
      </section>
      <Section
        description="Campos factuais da avaliação disponível para consulta."
        title="Resumo"
      >
        <Card className={styles.infoCard}>
          <p className={styles.cardDescription}>
            Registro de avaliação associado à cliente conforme a atribuição ativa.
          </p>
        </Card>
      </Section>
      <Section
        description="Chaves, valores e unidades exatamente como foram registrados."
        title="Medidas"
      >
        {measurements.length > 0 ? (
          <EvaluationMeasureList
            items={measurements.map((measurement) => ({
              label: measurement.measurement_key,
              unit: measurement.unit,
              value: formatMeasurementValue(measurement.measurement_value),
            }))}
          />
        ) : (
          <Card variant="subtle">
            <EmptyState
              description="Esta avaliação não possui medidas registradas."
              title="Sem medidas registradas"
            />
          </Card>
        )}
      </Section>
      <Section
        description="A comparação automática entre avaliações não está disponível nesta etapa."
        title="Comparação com avaliação anterior"
      >
        <Card variant="subtle">
          <EmptyState
            description="Nenhum cálculo ou interpretação entre avaliações é exibido nesta área."
            title="Comparação não disponível"
          />
        </Card>
      </Section>
      <Section
        description="Fotos e arquivos não são consultados nesta etapa."
        title="Fotos"
      >
        <Card variant="subtle">
          <EmptyState
            description="Nenhuma foto é exibida nesta visualização de leitura."
            title="Fotos não disponíveis"
          />
        </Card>
      </Section>
      <Section
        description="Registros de acompanhamento profissional não são consultados nesta etapa."
        title="Adesão e decisão profissional"
      >
        <Card variant="subtle">
          <EmptyState
            description="Nenhuma informação de acompanhamento profissional é exibida nesta visualização."
            title="Registro não disponível"
          />
        </Card>
      </Section>
      <Section
        description="Observações internas não são consultadas nesta etapa."
        title="Observações internas"
      >
        <Card variant="subtle">
          <EmptyState
            description="Nenhuma observação interna é exibida nesta visualização."
            title="Registro não disponível"
          />
        </Card>
      </Section>
    </>
  );
}
