import { EvaluationAdherenceDecision } from "@/components/admin/EvaluationAdherenceDecision";
import { EvaluationInternalNote } from "@/components/admin/EvaluationInternalNote";
import { EvaluationMeasureList } from "@/components/admin/EvaluationMeasureList";
import { EvaluationPhotoCollection } from "@/components/admin/EvaluationPhotoCollection";
import { EvaluationProfessionalFollowUpForm } from "@/components/admin/EvaluationProfessionalFollowUpForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientAssessment,
  listAccessibleAssessmentMeasurements,
  listAccessibleAssessmentPhotoFiles,
  listAccessibleProfessionalFollowUpsForAssessment,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminAvaliacaoDetailPageProps = {
  params: Promise<{
    avaliacaoId: string;
  }>;
};

const professionalDecisionLabels: Record<string, string> = {
  advance: "Avançar",
  maintain: "Manter",
  return: "Retornar",
  simplify: "Simplificar",
};

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatRecordDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function formatMeasurementValue(value: number) {
  return String(value);
}

function formatFileMetadata(
  mimeType: string | null,
  byteSize: number | null,
) {
  const parts: string[] = [];

  if (mimeType) {
    parts.push(mimeType);
  }

  if (typeof byteSize === "number") {
    parts.push(
      new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
      }).format(byteSize / 1024) + " KB",
    );
  }

  return parts.join(" · ");
}

export default async function AdminAvaliacaoDetailPage({
  params,
}: AdminAvaliacaoDetailPageProps) {
  const { avaliacaoId } = await params;
  const assessment = await getAccessibleClientAssessment(avaliacaoId);

  if (!assessment) {
    notFound();
  }

  const [measurements, photoFiles, followUps] = await Promise.all([
    listAccessibleAssessmentMeasurements(assessment.id),
    listAccessibleAssessmentPhotoFiles(assessment.id),
    listAccessibleProfessionalFollowUpsForAssessment(assessment.id),
  ]);

  const displayName = assessment.clients?.profiles?.display_name?.trim();
  const internalNotes = followUps.filter(
    (followUp) => Boolean(followUp.patty_observation?.trim()),
  );

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
        description="A comparação automática entre avaliações permanece fora desta etapa."
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
        description="Fotos privadas vinculadas diretamente a esta avaliação, carregadas somente após autorização administrativa."
        title="Fotos"
      >
        {photoFiles.length > 0 ? (
          <EvaluationPhotoCollection
            items={photoFiles.map((file) => ({
              id: file.id,
              label: file.original_filename?.trim() || "Foto vinculada",
              metadata: formatFileMetadata(file.mime_type, file.byte_size) || undefined,
              src: `/admin/fotos/${file.id}`,
            }))}
          />
        ) : (
          <Card variant="subtle">
            <EmptyState
              description="Nenhuma foto privada está vinculada a esta avaliação."
              title="Sem fotos vinculadas"
            />
          </Card>
        )}
      </Section>
      <Section
        description="Registre um novo acompanhamento profissional sem sobrescrever o histórico existente."
        title="Registrar acompanhamento"
      >
        <Card>
          <EvaluationProfessionalFollowUpForm assessmentId={assessment.id} />
        </Card>
      </Section>
      <Section
        description="Histórico factual de acompanhamento profissional associado a esta avaliação. Registrar uma decisão não executa mudança automática de protocolo ou fase."
        title="Adesão e decisão profissional"
      >
        {followUps.length > 0 ? (
          <ol className={styles.recordList}>
            {followUps.map((followUp) => (
              <li className={styles.recordItem} key={followUp.id}>
                <p className={styles.recordMeta}>
                  Registrado em {formatRecordDateTime(followUp.recorded_at)}
                </p>
                <EvaluationAdherenceDecision
                  adherencePerception={followUp.adherence_perception ?? undefined}
                  clientDifficulty={followUp.difficulty ?? undefined}
                  decision={
                    professionalDecisionLabels[followUp.professional_decision] ??
                    followUp.professional_decision
                  }
                  decisionReason={followUp.decision_reason}
                />
              </li>
            ))}
          </ol>
        ) : (
          <Card variant="subtle">
            <EmptyState
              description="Nenhum acompanhamento profissional está associado a esta avaliação."
              title="Sem acompanhamento registrado"
            />
          </Card>
        )}
      </Section>
      <Section
        description="Observações da Patty preservadas no histórico profissional e não destinadas à visualização da cliente."
        title="Observações internas"
      >
        {internalNotes.length > 0 ? (
          <ol className={styles.recordList}>
            {internalNotes.map((followUp) => (
              <li className={styles.recordItem} key={followUp.id}>
                <p className={styles.recordMeta}>
                  Registrado em {formatRecordDateTime(followUp.recorded_at)}
                </p>
                <EvaluationInternalNote
                  content={followUp.patty_observation ?? undefined}
                />
              </li>
            ))}
          </ol>
        ) : (
          <EvaluationInternalNote />
        )}
      </Section>
    </>
  );
}
