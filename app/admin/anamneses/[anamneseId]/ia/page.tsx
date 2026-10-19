import {
  acceptAiFindingAsInternalObservation,
  createPattyNoteFromAiFinding,
  recoverStartedAiExecution,
} from "@/app/admin/anamneses/[anamneseId]/ia/actions";
import { AdminAiReviewForm } from "@/components/admin/AdminAiReviewForm";
import { AdminAnamnesisWorkspaceHeader } from "@/components/admin/AdminAnamnesisWorkspaceHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { getOpenAiProviderReadiness } from "@/lib/ai/openai-provider";
import { presentStoredAiReview } from "@/lib/ai/anamnesis-review-history";
import { listAccessibleAiFindingActions } from "@/lib/ai/finding-actions";
import { ANAMNESIS_QUESTION_KEYS } from "@/lib/anamnesis/question-keys";
import { requiresAiExecutionRecoveryReview } from "@/lib/ai/execution-lifecycle";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAiAnamnesisExecutions,
  listAccessibleAiExecutionOutputs,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ anamneseId: string }>;
};

function findingLabel(type: string) {
  if (type === "possible_contradiction") return "Possível contradição";
  if (type === "clarification_needed") return "Esclarecimento sugerido";
  if (type === "missing_answer") return "Resposta aplicável ausente";
  return "Achado de IA";
}

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminAnamnesisAiPage({ params }: PageProps) {
  const { anamneseId } = await params;

  if (!isUuid(anamneseId)) {
    notFound();
  }
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission || !submission.submitted_at) {
    notFound();
  }

  const [questions, answers, executions] = await Promise.all([
    listAccessibleAnamnesisQuestions(submission.form_version_id),
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAiAnamnesisExecutions(submission.id),
  ]);
  const executionIds = executions.map((execution) => execution.id);
  const [outputs, findingActions] = await Promise.all([
    listAccessibleAiExecutionOutputs(executionIds),
    listAccessibleAiFindingActions(executionIds),
  ]);
  const readiness = getOpenAiProviderReadiness();
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  const outputsByExecutionId = new Map(
    outputs.map((output) => [output.execution_id, output]),
  );
  const allowedSourceAnswerIds = new Set(answers.map((answer) => answer.id));
  // This display allowlist checks question ownership; original execution validation
  // remains responsible for deciding which unanswered questions were applicable.
  const allowedQuestionIds = new Set(questions.map((question) => question.id));
  const findingActionsByKey = new Map<
    string,
    { action: "accepted_internal_observation" | "converted_to_patty_note"; reviewId: string | null; createdAt: string }
  >();

  for (const action of findingActions) {
    const key = action.execution_id + ":" + action.finding_index;
    findingActionsByKey.set(key, {
      action: action.action,
      reviewId: action.anamnesis_review_id,
      createdAt: action.created_at,
    });
  }
  const financialQuestion = questions.find(
    (question) =>
      question.question_key ===
      ANAMNESIS_QUESTION_KEYS.financialCapacityForSupplements,
  );
  const financialAnswer = financialQuestion
    ? answers.find((answer) => answer.question_id === financialQuestion.id)
    : undefined;

  return (
    <>
      <AdminAnamnesisWorkspaceHeader
        activeSection="ia"
        clientId={submission.client_id}
        displayName={submission.clients?.full_name?.trim() || submission.clients?.profiles?.display_name?.trim()}
        submissionId={submission.id}
        submittedAt={submission.submitted_at}
      />

      <Alert
        title="Revisão humana obrigatória"
        variant="info"
      >
        Nenhum achado cria diagnóstico, pendência, mensagem para cliente,
        protocolo ou publicação automática.
      </Alert>

      <Section
        description="A execução usa somente respostas permitidas pelo contexto minimizado e preserva a versão exata do prompt, modelo e fontes."
        title="Nova execução"
      >
        <Card>
          <p className={styles.text}>
            Cidade/endereço, telefone, email de contato, Instagram,
            escolaridade e aceite de consentimento não entram no contexto da
            IA nem aparecem como resposta ausente. Capacidade financeira
            continua opt-in por execução.
          </p>
          <AdminAiReviewForm
            financialAnswerId={financialAnswer?.id ?? null}
            model={readiness.ready ? readiness.model : null}
            providerReady={readiness.ready}
            submissionId={submission.id}
          />
        </Card>
      </Section>

      <Section
        description="Histórico imutável das execuções desta Anamnese."
        title="Histórico da IA"
      >
        {executions.length === 0 ? (
          <EmptyState
            description="Ainda não existe execução de IA para esta Anamnese."
            title="Sem análises assistidas"
          />
        ) : (
          <div className={styles.stack}>
            {executions.map((execution) => {
              const output = outputsByExecutionId.get(execution.id);
              const review = presentStoredAiReview({
                allowedQuestionIds,
                allowedSourceAnswerIds,
                completedAt: execution.completed_at,
                content: output?.content,
                failedAt: execution.failed_at,
                status: execution.status,
              });
              const findings = review.findings;

              return (
                <Card className={styles.entry} key={execution.id}>
                  <div className={styles.entryHeader}>
                    <h2 className={styles.title}>
                      {execution.provider} · {execution.model_identifier}
                    </h2>
                    <Badge variant="neutral">{execution.status === "completed" ? "Concluída" : execution.status === "failed" ? "Falhou" : execution.status === "started" ? "Iniciada" : "Estado desconhecido"}</Badge>
                  </div>

                  <p className={styles.meta}>
                    Iniciada em {formatDateTime(execution.created_at)}
                  </p>

                  {requiresAiExecutionRecoveryReview({
                    status: execution.status,
                    completedAt: execution.completed_at,
                    failedAt: execution.failed_at,
                  }) ? (
                    <>
                      <Alert
                        title="Execução sem estado terminal"
                        variant="warning"
                      >
                        Esta execução permanece iniciada e não foi convertida
                        automaticamente em falha. Nenhum resultado deve ser
                        presumido. A recuperação abaixo exige decisão humana e
                        registra a execução como falha sem inventar timeout.
                      </Alert>
                      <form
                        action={recoverStartedAiExecution.bind(
                          null,
                          submission.id,
                          execution.id,
                        )}
                        className={styles.recoveryForm}
                      >
                        <label>
                          <span>Motivo da recuperação manual</span>
                          <textarea
                            maxLength={500}
                            minLength={10}
                            name="recoveryReason"
                            placeholder="Ex.: execução interrompida antes de registrar resposta; revisar antes de tentar novamente."
                            required
                          />
                        </label>
                        <Button size="compact" type="submit" variant="secondary">
                          Encerrar como falha e liberar nova tentativa
                        </Button>
                      </form>
                    </>
                  ) : null}

                  {execution.status === "failed" ? (
                    <Alert title="Execução falhou" variant="warning">
                      {execution.failure_message ??
                        "A falha foi registrada sem publicar nenhum resultado."}
                    </Alert>
                  ) : null}

                  {execution.status === "completed" &&
                  review.state === "missing_output" ? (
                    <Alert title="Resultado da IA não encontrado" variant="warning">
                      A execução consta como concluída, mas não há resultado
                      persistido para revisão. Nenhum achado pode ser aceito.
                      O registro original foi preservado.
                    </Alert>
                  ) : null}

                  {execution.status === "completed" &&
                  review.state === "invalid_output" ? (
                    <Alert title="Resultado da IA indisponível para revisão" variant="warning">
                      Os dados registrados não passaram pela validação de
                      integridade para exibição. Nenhum achado pode ser aceito
                      ou convertido em anotação sem conferência técnica.
                    </Alert>
                  ) : null}

                  {review.state === "ready" && findings.length === 0 ? (
                    <p className={styles.text}>
                      Execução concluída sem achados para revisão.
                    </p>
                  ) : null}

                  {findings.map((finding, index) => {
                    const actionKey = execution.id + ":" + index;
                    const recordedAction =
                      findingActionsByKey.get(actionKey) ?? null;
                    const acceptedAsObservation =
                      recordedAction?.action === "accepted_internal_observation";
                    const convertedToNote =
                      recordedAction?.action === "converted_to_patty_note";
                    const sourceLabels = finding.source_answer_ids.map(
                      (answerId) => {
                        const answer = answersById.get(answerId);
                        return answer
                          ? questionsById.get(answer.question_id)?.label ??
                              "Resposta da Anamnese"
                          : "Resposta da Anamnese";
                      },
                    );
                    const targetLabel = finding.target_question_id
                      ? questionsById.get(finding.target_question_id)?.label
                      : undefined;

                    return (
                      <div
                        className={styles.finding}
                        key={`${execution.id}-${index}`}
                      >
                        <h3 className={styles.title}>
                          {findingLabel(finding.type)}
                        </h3>
                        <p className={styles.text}>{finding.explanation}</p>
                        {sourceLabels.length > 0 ? (
                          <ul className={styles.list}>
                            {sourceLabels.map((label, sourceIndex) => (
                              <li key={`${label}-${sourceIndex}`}>{label}</li>
                            ))}
                          </ul>
                        ) : null}
                        {targetLabel ? (
                          <p className={styles.meta}>
                            Pergunta relacionada: {targetLabel}
                          </p>
                        ) : null}
                        {finding.suggested_follow_up_question ? (
                          <p className={styles.suggested}>
                            Sugestão interna:{" "}
                            {finding.suggested_follow_up_question}
                          </p>
                        ) : null}

                        <div className={styles.findingActions}>
                          <p className={styles.actionStatus}>
                            O achado original permanece imutável. As ações abaixo
                            registram uma decisão humana separada.
                          </p>

                          {acceptedAsObservation ? (
                            <Badge variant="positive">
                              Aceito como observação interna
                            </Badge>
                          ) : null}

                          {convertedToNote ? (
                            <>
                              <Badge variant="positive">
                                Anotação profissional criada
                              </Badge>
                              {recordedAction?.reviewId && isUuid(recordedAction.reviewId) ? (
                                <Link
                                  href={`/admin/anamneses/${submission.id}/revisao#revisao-${recordedAction.reviewId}`}
                                >
                                  Abrir anotação profissional exata
                                </Link>
                              ) : null}
                            </>
                          ) : null}

                          {recordedAction ? (
                            <p className={styles.meta}>Decisão profissional registrada em {formatDateTime(recordedAction.createdAt)}. O achado da IA foi preservado.</p>
                          ) : null}

                          {!recordedAction ? (
                            <>
                              <form
                                action={acceptAiFindingAsInternalObservation.bind(
                                  null,
                                  submission.id,
                                  execution.id,
                                  index,
                                )}
                              >
                                <Button
                                  size="compact"
                                  type="submit"
                                  variant="secondary"
                                >
                                  Aceitar como observação interna
                                </Button>
                              </form>

                              <form
                                action={createPattyNoteFromAiFinding.bind(
                                  null,
                                  submission.id,
                                  execution.id,
                                  index,
                                )}
                                className={styles.noteForm}
                              >
                                <label>
                                  <span>Anotação da Patty</span>
                                  <textarea
                                    maxLength={4000}
                                    name="pattyNote"
                                    placeholder="Escreva com suas próprias palavras."
                                    required
                                  />
                                </label>
                                <Button size="compact" type="submit">
                                  Salvar como anotação da Patty
                                </Button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
