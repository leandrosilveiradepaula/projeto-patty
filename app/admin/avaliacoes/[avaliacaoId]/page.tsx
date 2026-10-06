import { correctFinalizedAssessmentMeasurementAction } from "@/app/admin/avaliacoes/[avaliacaoId]/actions";
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
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import {
  loadAssessmentDefinition,
  loadSupportedAssessmentKindOptions,
  resolveSupportedAssessmentKindOption,
} from "@/lib/evaluations/assessment-configuration-loader";
import { buildConfigurableAssessmentReadiness } from "@/lib/evaluations/assessment-definition";
import { listAccessibleAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-correction-store";
import { applyAssessmentMeasurementCorrections } from "@/lib/evaluations/measurement-corrections";
import {
  buildFactualMeasurementComparison,
  formatProfessionalMeasurementLabel,
} from "@/lib/evaluations/professional-view";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatRecordDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
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
  const assessmentKinds = await loadSupportedAssessmentKindOptions();
  const selectedAssessmentKind = resolveSupportedAssessmentKindOption(
    assessmentKinds.options,
    assessment.assessment_kind,
  );
  const assessmentDefinition = selectedAssessmentKind
    ? await loadAssessmentDefinition(selectedAssessmentKind.semanticKey)
    : null;
  const kindOptions = assessmentKinds.options.map((option) => ({
    label: option.label,
    value: option.historicalCode,
  }));
  const [rawMeasurements, photoFiles, followUps, clientAssessments, clientFiles] =
    await Promise.all([
      listAccessibleAssessmentMeasurements(assessment.id),
      listAccessibleAssessmentPhotoFiles(assessment.id),
      listAccessibleProfessionalFollowUpsForAssessment(assessment.id),
      listAccessibleAssessmentsForClient(assessment.client_id),
      isDraft ? listAccessibleClientFiles(assessment.client_id) : Promise.resolve([]),
    ]);
  const measurementCorrections =
    await listAccessibleAssessmentMeasurementCorrections(
      rawMeasurements.map((measurement) => measurement.id),
    );
  const measurements = applyAssessmentMeasurementCorrections(
    rawMeasurements,
    measurementCorrections,
  );

  const previousAssessment =
    clientAssessments.find(
      (item) =>
        item.id !== assessment.id &&
        Boolean(item.finalized_at) &&
        new Date(item.assessed_at).getTime() <
          new Date(assessment.assessed_at).getTime(),
    ) ?? null;
  const previousRawMeasurements = previousAssessment
    ? await listAccessibleAssessmentMeasurements(previousAssessment.id)
    : [];
  const previousCorrections =
    previousRawMeasurements.length > 0
      ? await listAccessibleAssessmentMeasurementCorrections(
          previousRawMeasurements.map((measurement) => measurement.id),
        )
      : [];
  const previousMeasurements = applyAssessmentMeasurementCorrections(
    previousRawMeasurements,
    previousCorrections,
  );
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
  const finalizationReadiness = assessmentDefinition
    ? buildConfigurableAssessmentReadiness(
        assessmentDefinition.configuration,
        {
          measurementKeys: measurements.map(
            (measurement) => measurement.measurement_key,
          ),
          photoCount: photoFiles.length,
        },
      )
    : null;

  return (
    <>
      <ClientSummaryHeader
        actions={
          <Link
            className={styles.backLink}
            href={`/admin/clientes/${assessment.client_id}/avaliacoes`}
          >
            Voltar às avaliações da cliente
          </Link>
        }
        meta={`${formatAssessmentDate(assessment.assessed_at)} · ${
          selectedAssessmentKind?.label ?? "Legada / não classificada"
        }`}
        name={displayName || "Cliente sem nome informado"}
        secondary="Avaliação corporal"
        status={
          <Badge variant={isDraft ? "warning" : "positive"}>
            {isDraft ? "Rascunho" : "Finalizada"}
          </Badge>
        }
      />
      <ClientWorkspaceNav
        activeArea="avaliacoes"
        clientId={assessment.client_id}
      />
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
              kindOptions={kindOptions}
            />
          </Card>
        </Section>
      ) : null}
      <Section
        description="Requisitos determinísticos da versão ativa para o tipo selecionado. A leitura profissional continua separada desta validação."
        title="Requisitos da avaliação"
      >
        <Card className={styles.infoCard}>
          {assessmentDefinition ? (
            <ul className={styles.cadenceList}>
              {assessmentDefinition.configuration.requiredMeasurements.map(
                (requirement) => (
                  <li key={requirement.key}>{requirement.label}</li>
                ),
              )}
              {assessmentDefinition.configuration.photoRequirement ? (
                <li>
                  {assessmentDefinition.configuration.photoRequirement.label}
                  {" · mínimo "}
                  {assessmentDefinition.configuration.photoRequirement.minimumCount}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={styles.cardDescription}>
              O tipo histórico desta avaliação não corresponde a uma definição
              ativa disponível.
            </p>
          )}
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
              ) : (
                <details>
                  <summary>Corrigir lançamento</summary>
                  <form
                    action={correctFinalizedAssessmentMeasurementAction.bind(
                      null,
                      assessment.id,
                      measurement.id,
                    )}
                  >
                    <label>
                      <span>Valor corrigido</span>
                      <input
                        defaultValue={String(measurement.measurement_value)}
                        inputMode="decimal"
                        name="correctedMeasurementValue"
                        required
                      />
                    </label>
                    <label>
                      <span>Unidade</span>
                      <input
                        defaultValue={measurement.unit}
                        maxLength={40}
                        name="correctedUnit"
                        required
                      />
                    </label>
                    <label>
                      <span>Observação opcional</span>
                      <input maxLength={240} name="correctionNote" />
                    </label>
                    <button type="submit">Registrar correção</button>
                  </form>
                </details>
              ),
              id: measurement.id,
              label:
                formatProfessionalMeasurementLabel(measurement.measurement_key) +
                (measurement.correction_count > 0 ? " · corrigida" : ""),
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
      {!isDraft && measurementCorrections.length > 0 ? (
        <Section
          description="Cada correção preserva o lançamento original e acrescenta um novo fato histórico. A correção mais recente é o valor vigente na leitura e na comparação."
          title="Histórico de correções"
        >
          <ol className={styles.recordList}>
            {measurementCorrections.map((correction) => {
              const original = rawMeasurements.find(
                (measurement) =>
                  measurement.id === correction.assessment_measurement_id,
              );

              return (
                <li className={styles.recordItem} key={correction.id}>
                  <Card variant="subtle">
                    <p className={styles.recordMeta}>
                      {original
                        ? formatProfessionalMeasurementLabel(
                            original.measurement_key,
                          )
                        : "Medida"}{" "}
                      · {formatRecordDateTime(correction.created_at)}
                    </p>
                    <p className={styles.cardDescription}>
                      Corrigido para{" "}
                      {formatMeasurementValue(
                        correction.corrected_measurement_value,
                      )}{" "}
                      {correction.corrected_unit}.
                      {correction.note?.trim()
                        ? " Observação: " + correction.note.trim()
                        : ""}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}
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
