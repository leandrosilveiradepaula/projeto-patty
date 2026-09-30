import {
  AssessmentDeleteMeasurementButton,
  AssessmentDraftMetadataForm,
  AssessmentFinalizeForm,
  AssessmentMeasurementForm,
  AssessmentPhotoLinkForm,
  AssessmentPhotoUnlinkButton,
} from "@/components/admin/AssessmentDraftForms";
import { EvaluationAdherenceDecision } from "@/components/admin/EvaluationAdherenceDecision";
import { EvaluationInternalNote } from "@/components/admin/EvaluationInternalNote";
import { EvaluationMeasureComparison } from "@/components/admin/EvaluationMeasureComparison";
import { EvaluationMeasureList } from "@/components/admin/EvaluationMeasureList";
import { EvaluationPhotoCollection } from "@/components/admin/EvaluationPhotoCollection";
import { EvaluationProfessionalFollowUpForm } from "@/components/admin/EvaluationProfessionalFollowUpForm";
import {
  assessmentKindLabel,
  isAssessmentKind,
} from "@/lib/evaluations/assessment-draft";
import { buildAssessmentFinalizationReadiness } from "@/lib/evaluations/assessment-readiness";
import {
  buildFactualMeasurementComparison,
  formatProfessionalMeasurementLabel,
} from "@/lib/evaluations/professional-view";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClientAssessment,
  listAccessibleAssessmentMeasurements,
  listAccessibleAssessmentPhotoFiles,
  listAccessibleAssessmentsForClient,
  listAccessibleClientFiles,
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

  const isDraft = !assessment.finalized_at;
  const [measurements, photoFiles, followUps, clientAssessments, clientFiles] =
    await Promise.all([
      listAccessibleAssessmentMeasurements(assessment.id),
      listAccessibleAssessmentPhotoFiles(assessment.id),
      listAccessibleProfessionalFollowUpsForAssessment(assessment.id),
      listAccessibleAssessmentsForClient(assessment.client_id),
      isDraft ? listAccessibleClientFiles(assessment.client_id) : Promise.resolve([]),
    ]);

  const previousAssessment =
    clientAssessments.find(
      (item) =>
        item.id !== assessment.id &&
        Boolean(item.finalized_at) &&
        new Date(item.assessed_at).getTime() <
          new Date(assessment.assessed_at).getTime(),
    ) ?? null;
  const previousMeasurements = previousAssessment
    ? await listAccessibleAssessmentMeasurements(previousAssessment.id)
    : [];
  const factualComparison = buildFactualMeasurementComparison(
    measurements,
    previousMeasurements,
  );

  const linkedPhotoIds = new Set(photoFiles.map((file) => file.id));
  const availablePhotos = clientFiles
    .filter(
      (file) => file.file_kind === "photo" && !linkedPhotoIds.has(file.id),
    )
    .map((file) => ({
      id: file.id,
      label:
        file.original_filename?.trim() ||
        `Foto de ${formatAssessmentDate(file.created_at)}`,
    }));
  const displayName = assessment.clients?.profiles?.display_name?.trim();
  const internalNotes = followUps.filter(
    (followUp) => Boolean(followUp.patty_observation?.trim()),
  );
  const assessmentKind = assessment.assessment_kind;
  const finalizationReadiness =
    typeof assessmentKind === "string" && isAssessmentKind(assessmentKind)
      ? buildAssessmentFinalizationReadiness({
        assessmentKind,
        measurementKeys: measurements.map(
          (measurement) => measurement.measurement_key,
        ),
          photoCount: photoFiles.length,
        })
      : null;

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
              <dt>Tipo</dt>
              <dd>{assessmentKindLabel(assessment.assessment_kind)}</dd>
            </div>
            <div className={styles.summaryDetail}>
              <dt>Identificador</dt>
              <dd>{assessment.id}</dd>
            </div>
          </dl>
        </div>
        <Badge variant={isDraft ? "warning" : "neutral"}>
          {isDraft ? "Rascunho" : "Finalizada"}
        </Badge>
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
      {isDraft ? (
        <Section
          description="Data, tipo, medidas e vínculos de foto podem ser ajustados enquanto esta avaliação estiver em rascunho."
          title="Editar rascunho"
        >
          <Card>
            <AssessmentDraftMetadataForm
              assessedAt={assessment.assessed_at}
              assessmentId={assessment.id}
              assessmentKind={assessment.assessment_kind}
            />
          </Card>
        </Section>
      ) : null}
      <Section
        description="Referência operacional confirmada pela Patty. Não define sozinho se uma avaliação está completa."
        title="Cadência de acompanhamento corporal"
      >
        <Card className={styles.infoCard}>
          <ul className={styles.cadenceList}>
            <li>
              <strong>Quinzenal:</strong> peso, cintura, abdômen e quadril.
            </li>
            <li>
              <strong>Mensal:</strong> avaliação completa, peso e fotos.
            </li>
            <li>
              <strong>Leitura profissional:</strong> visual e medidas podem ter mais peso do que a balança isolada; peito é uma medida adicional relevante, sem encerrar o catálogo mensal.
            </li>
          </ul>
        </Card>
      </Section>
      {isDraft ? (
        <Section
          description="Cadastre ou atualize uma medida no rascunho. O catálogo de chaves e unidades continua aberto; por isso o sistema não impõe nomes ou unidades não confirmados."
          title="Adicionar ou atualizar medida"
        >
          <Card>
            <AssessmentMeasurementForm assessmentId={assessment.id} />
          </Card>
        </Section>
      ) : null}
      <Section
        description="Chaves, valores e unidades exatamente como foram registrados."
        title="Medidas"
      >
        {measurements.length > 0 ? (
          <EvaluationMeasureList
            items={measurements.map((measurement) => ({
              action: isDraft ? (
                <AssessmentDeleteMeasurementButton
                  assessmentId={assessment.id}
                  measurementId={measurement.id}
                />
              ) : undefined,
              id: measurement.id,
              label: formatProfessionalMeasurementLabel(measurement.measurement_key),
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
        description="Comparação factual dos mesmos measurement_key entre a avaliação atual e a imediatamente anterior. Não calcula tendência, sucesso, estagnação ou recomendação."
        title="Comparação com avaliação anterior"
      >
        {previousAssessment && factualComparison.length > 0 ? (
          <EvaluationMeasureComparison
            currentDate={formatAssessmentDate(assessment.assessed_at)}
            items={factualComparison}
            previousDate={formatAssessmentDate(previousAssessment.assessed_at)}
          />
        ) : (
          <Card variant="subtle">
            <EmptyState
              description="Não há avaliação anterior comparável ou medidas registradas nesta avaliação."
              title="Comparação não disponível"
            />
          </Card>
        )}
      </Section>
      {isDraft ? (
        <Section
          description="Vincule uma foto privada já cadastrada para esta cliente. Desvincular remove apenas o vínculo com a avaliação e preserva o arquivo original."
          title="Vincular foto ao rascunho"
        >
          <Card>
            <AssessmentPhotoLinkForm
              assessmentId={assessment.id}
              photos={availablePhotos}
            />
          </Card>
        </Section>
      ) : null}
      <Section
        description="Fotos privadas vinculadas diretamente a esta avaliação, carregadas somente após autorização administrativa."
        title="Fotos"
      >
        {photoFiles.length > 0 ? (
          <EvaluationPhotoCollection
            items={photoFiles.map((file) => ({
              action: isDraft ? (
                <AssessmentPhotoUnlinkButton
                  assessmentId={assessment.id}
                  clientFileId={file.id}
                />
              ) : undefined,
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
      {isDraft ? (
        <Section
          description="Finalizar congela data, tipo, medidas e vínculos de foto. A Básica exige peso, cintura, abdômen e quadril; a Completa exige o catálogo corporal confirmado e pelo menos uma foto."
          title="Finalizar avaliação"
        >
          <Card>
            <AssessmentFinalizeForm
              assessmentId={assessment.id}
              readinessItems={finalizationReadiness?.items ?? []}
            />
          </Card>
        </Section>
      ) : null}
      <Section
        description="Decisões profissionais são registradas somente depois que a coleta da avaliação foi finalizada."
        title="Registrar acompanhamento"
      >
        {isDraft ? (
          <Card variant="subtle">
            <EmptyState
              description="Finalize a avaliação antes de registrar uma decisão profissional."
              title="Avaliação ainda em rascunho"
            />
          </Card>
        ) : (
          <Card>
            <EvaluationProfessionalFollowUpForm assessmentId={assessment.id} />
          </Card>
        )}
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
