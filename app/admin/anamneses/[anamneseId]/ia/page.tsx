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
import { reconstructStoredReviewMissingTargets } from "@/lib/ai/anamnesis-review-context";
import { auditFindingActionLinks } from "@/lib/ai/finding-action-integrity";
import { listAccessibleAiFindingActions } from "@/lib/ai/finding-actions";
import { ANAMNESIS_QUESTION_KEYS } from "@/lib/anamnesis/question-keys";
import { requiresAiExecutionRecoveryReview } from "@/lib/ai/execution-lifecycle";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAiAnamnesisExecutions,
  listAccessibleAiAnamnesisAnswerSources,
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
  const [outputs, sources, findingActions] = await Promise.all([
    listAccessibleAiExecutionOutputs(executionIds),
    listAccessibleAiAnamnesisAnswerSources(executionIds),
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
  // Source provenance is both execution-scoped and submission-scoped.
  // An answer belonging to this Anamnese is not necessarily an answer supplied
  // to the AI in this particular execution.
  const includedAnswerIdsByExecutionId = new Map<string, Set<string>>();
  for (const source of sources) {
    if (
      source.anamnesis_submission_id !== submission.id ||
      !source.anamnesis_answer_id ||
      !answersById.has(source.anamnesis_answer_id)
    ) continue;
    const included = includedAnswerIdsByExecutionId.get(source.execution_id) ??
      new Set<string>();
    included.add(source.anamnesis_answer_id);
    includedAnswerIdsByExecutionId.set(source.execution_id, included);
  }
  // Reconstruct applicability using the same deterministic, minimized context
  // rules used at execution preparation. Answered, conditional-hidden and
  // informational questions must never be displayed as missing answers.
  const allowedMissingTargetQuestionIds = reconstructStoredReviewMissingTargets({
    answers,
    formVersionId: submission.form_version_id,
    questions,
    submissionId: submission.id,
  });
  // Keep every RLS-visible historical action, even if its snapshot cannot
  // safely be associated with the currently validated original output.
  const findingActionsByExecutionId = new Map<string, typeof findingActions>();
  for (const action of findingActions) {
    const existing = findingActionsByExecutionId.get(action.execution_id) ?? [];
    existing.push(action);
    findingActionsByExecutionId.set(action.execution_id, existing);
  }
  const financialQuestion = questions.find(
    (question) =>
      question.question_key ===
      ANAMNESIS_QUESTION_KEYS.financialCapacityForSupplements,
  );
  const financialAnswer = financialQuestion
    ? answers.find((answer) => answer.question_id === financialQuestion.id)
    : undefined;

  const hasPendingReview = executions.some((execution) => {
    if (requiresAiExecutionRecoveryReview({
      status: execution.status,
      completedAt: execution.completed_at,
      failedAt: execution.failed_at,
    })) return true;
    const output = outputsByExecutionId.get(execution.id);
    const review = presentStoredAiReview({
      allowedMissingTargetQuestionIds,
      allowedSourceAnswerIds:
        includedAnswerIdsByExecutionId.get(execution.id) ?? new Set<string>(),
      completedAt: execution.completed_at,
      content: output?.content,
      failedAt: execution.failed_at,
      status: execution.status,
    });
    if (review.state !== "ready" || review.findings.length === 0) return false;
    const audit = auditFindingActionLinks(
      review.findings,
      findingActionsByExecutionId.get(execution.id) ?? [],
    );
    return audit.pendingIndices.length > 0;
  });

  const newExecutionSection = (
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
  );

  return (
    <>
      <AdminAnamnesisWorkspaceHeader
        activeSection="ia"
        clientId={submission.client_id}
        displayName={submission.clients?.full_name?.trim() || submission.clients?.profiles?.display_name?.trim()}
        submissionId={submission.id}
        submittedAt={submission.submitted_at}
      />

      <p className={styles.text}>
        <Link href="/admin/ia">Voltar à fila de análises</Link>
      </p>

      <Alert
        title="Revisão humana obrigatória"
        variant="info"
      >
        Nenhum achado cria diagnóstico, pendência, mensagem para cliente,
        protocolo ou publicação automática.
      </Alert>

      {!hasPendingReview ? newExecutionSection : null}

      {hasPendingReview ? (
        <p className={styles.text} role="status">
          Existem análises aguardando uma decisão ou recuperação humana.
          Revise o histórico antes de iniciar outra execução.
        </p>
      ) : null}
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
                allowedMissingTargetQuestionIds,
                allowedSourceAnswerIds:
                  includedAnswerIdsByExecutionId.get(execution.id) ?? new Set<string>(),
                completedAt: execution.completed_at,
                content: output?.content,
                failedAt: execution.failed_at,
                status: execution.status,
              });
              const findings = review.findings;
              const audit = auditFindingActionLinks(
                findings,
                findingActionsByExecutionId.get(execution.id) ?? [],
              );

              return (
                <Card className={styles.entry} id={`execucao-ia-${execution.id}`} key={execution.id}>
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

                  {review.state === "ready" && findings.length > 0 ? (
                    <div className={styles.actionSummary}>
                      <p role="status">
                        {audit.reviewedCount} de {findings.length} achado(s) com
                        decisão humana vinculada; {audit.pendingIndices.length} aguardando
                        decisão.
                      </p>
                      {audit.pendingIndices.length > 0 ? (
                        <Link
                          className={styles.sourceLink}
                          href={`#achado-ia-${execution.id}-${audit.pendingIndices[0]}`}
                        >
                          Ir ao primeiro achado aguardando decisão
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {audit.unmatchedActions.length > 0 ? (
                    <div className={styles.integrityHistory}>
                      <Alert title="Vínculo histórico de decisão exige conferência" variant="warning">
                        {audit.unmatchedActions.length} registro(s) de decisão
                        preservado(s), mas sem correspondência confirmada com o
                        achado original validado. Não atribua estas decisões a
                        outros achados. A verificação deve ser técnica e humana.
                      </Alert>
                      <details className={styles.integrityDetails}>
                        <summary>Consultar decisões históricas sem vínculo confirmado</summary>
                        <ul className={styles.integrityList}>
                          {audit.unmatchedActions.map((action) => (
                            <li key={action.id}>
                              <p className={styles.meta}>
                                {action.action === "converted_to_patty_note"
                                  ? "Anotação profissional"
                                  : "Observação interna"} registrada em{" "}
                                {formatDateTime(action.created_at)}.
                              </p>
                              <p className={styles.meta}>
                                Responsável: {action.actor_display_name || "Nome não disponível"}.
                                Índice histórico: {action.finding_index}.
                              </p>
                              <details className={styles.actorAudit}>
                                <summary>Ver identificadores de auditoria</summary>
                                <code>Ação: {action.id}</code>
                                <code>Perfil: {action.acted_by_profile_id}</code>
                              </details>
                              {action.action === "converted_to_patty_note" &&
                              action.anamnesis_review_id &&
                              isUuid(action.anamnesis_review_id) ? (
                                <Link
                                  className={styles.sourceLink}
                                  href={`/admin/anamneses/${submission.id}/revisao#revisao-${action.anamnesis_review_id}`}
                                >
                                  Abrir anotação profissional registrada
                                </Link>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  ) : null}

                  {findings.map((finding, index) => {
                    const recordedActions = audit.matchedByIndex.get(index) ?? [];
                    const hasRecordedAction = audit.lockedIndices.has(index);
                    const acceptedAsObservation = recordedActions.some(
                      (action) => action.action === "accepted_internal_observation",
                    );
                    const convertedToNote = recordedActions.some(
                      (action) => action.action === "converted_to_patty_note",
                    );
                    const sourceReferences = finding.source_answer_ids.map(
                      (answerId) => {
                        const questionId = answersById.get(answerId)?.question_id;
                        const question = questionId ? questionsById.get(questionId) : null;
                        return {
                          answerId,
                          label: question?.label ?? "Resposta da Anamnese",
                          questionId: question?.id ?? null,
                        };
                      },
                    );
                    const targetLabel = finding.target_question_id
                      ? questionsById.get(finding.target_question_id)?.label
                      : undefined;

                    return (
                      <div
                        className={styles.finding}
                        id={`achado-ia-${execution.id}-${index}`}
                        key={`${execution.id}-${index}`}
                        tabIndex={-1}
                      >
                        <h3 className={styles.title}>
                          {findingLabel(finding.type)}
                        </h3>
                        <p className={styles.text}>{finding.explanation}</p>
                        {sourceReferences.length > 0 ? (
                          <ul className={styles.list}>
                            {sourceReferences.map((source) => (
                              <li key={source.answerId}>
                                {source.questionId ? (
                                  <Link
                                    className={styles.sourceLink}
                                    href={`/admin/anamneses/${submission.id}#resposta-${source.questionId}`}
                                  >
                                    Ver resposta original: {source.label}
                                  </Link>
                                ) : (
                                  <span>Resposta original indisponível para navegação</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {targetLabel && finding.target_question_id ? (
                          <p className={styles.meta}>
                            Pergunta relacionada:{" "}
                            <Link
                              className={styles.sourceLink}
                              href={`/admin/anamneses/${submission.id}#resposta-${finding.target_question_id}`}
                            >
                              Ver pergunta original: {targetLabel}
                            </Link>
                          </p>
                        ) : null}
                        {finding.suggested_follow_up_question ? (
                          <p className={styles.suggested}>
                            Sugestão interna:{" "}
                            {finding.suggested_follow_up_question}
                          </p>
                        ) : null}

                        {!hasRecordedAction && finding.type === "clarification_needed" ? (
                          <p className={styles.meta}>
                            <Link
                              className={styles.sourceLink}
                              href={`/admin/anamneses/${submission.id}/esclarecimentos${finding.source_answer_ids.length === 1 ? `?resposta=${finding.source_answer_ids[0]}` : ""}#novo-pedido`}
                            >
                              Preparar pedido de esclarecimento manual
                            </Link>
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
                            <Badge variant="positive">
                              Anotação profissional criada
                            </Badge>
                          ) : null}

                          {recordedActions.length > 1 ? (
                            <Alert title="Mais de uma decisão registrada" variant="warning">
                              Existem decisões humanas distintas para este achado.
                              Todas foram preservadas abaixo para conferência.
                            </Alert>
                          ) : null}

                          {hasRecordedAction && recordedActions.length === 0 ? (
                            <Alert title="Decisão histórica não associável" variant="warning">
                              Existe decisão registrada neste índice, mas sua
                              cópia imutável não coincide com o achado exibido.
                              Nenhuma nova ação está disponível até a conferência técnica.
                            </Alert>
                          ) : null}

                          {recordedActions.map((action) => (
                            <div key={action.id}>
                              <p className={styles.meta}>
                                {action.action === "converted_to_patty_note"
                                  ? "Anotação profissional"
                                  : "Observação interna"} registrada em{" "}
                                {formatDateTime(action.created_at)}. O achado
                                original da IA foi preservado.
                              </p>
                              <p className={styles.meta}>
                                Responsável pela decisão:{" "}
                                {action.actor_display_name || "Nome não disponível"}
                              </p>
                              <details className={styles.actorAudit}>
                                <summary>Ver identificador do responsável</summary>
                                <code>{action.acted_by_profile_id}</code>
                              </details>
                              {action.action === "converted_to_patty_note" &&
                              action.anamnesis_review_id &&
                              isUuid(action.anamnesis_review_id) ? (
                                <Link
                                  href={`/admin/anamneses/${submission.id}/revisao#revisao-${action.anamnesis_review_id}`}
                                >
                                  Abrir anotação profissional exata
                                </Link>
                              ) : null}
                            </div>
                          ))}

                          {!hasRecordedAction ? (
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
      {hasPendingReview ? newExecutionSection : null}
    </>
  );
}
