import { ClientAnamnesisDraftSingleChoiceAnswerForm } from "@/components/client/ClientAnamnesisDraftSingleChoiceAnswerForm";
import { ClientAnamnesisDraftTextAnswerForm } from "@/components/client/ClientAnamnesisDraftTextAnswerForm";
import { ClientAnamnesisSubmitForm } from "@/components/client/ClientAnamnesisSubmitForm";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getApplicableAnamnesisQuestionIds } from "@/lib/anamnesis/applicability";
import { summarizeAnamnesisDraftRequiredAnswers } from "@/lib/anamnesis/draft-progress";
import { ANAMNESIS_QUESTION_KEYS } from "@/lib/anamnesis/question-keys";
import {
  canEditDraftSingleChoiceAnswer,
  canEditDraftTextAnswer,
  getDraftSingleChoiceOptions,
} from "@/lib/anamnesis/draft-policy";
import {
  getAccessibleAnamnesisSubmission,
  getCurrentClient,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
  listAccessibleAnamnesisSections,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { isUuid } from "@/lib/validation/uuid";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type ClienteAnamneseDetailPageProps = {
  params: Promise<{
    anamneseId: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    submitted?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatAnswerValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function isStructuredAnswer(value: unknown) {
  return typeof value === "object" && value !== null;
}

export default async function ClienteAnamneseDetailPage({
  params,
  searchParams,
}: ClienteAnamneseDetailPageProps) {
  const [{ anamneseId }, query] = await Promise.all([params, searchParams]);

  if (!isUuid(anamneseId)) {
    notFound();
  }

  const [client, submission] = await Promise.all([
    getCurrentClient(),
    getAccessibleAnamnesisSubmission(anamneseId),
  ]);

  if (!client || !submission || submission.client_id !== client.id) {
    notFound();
  }

  const [sections, questions, answers] = await Promise.all([
    listAccessibleAnamnesisSections(submission.form_version_id),
    listAccessibleAnamnesisQuestions(submission.form_version_id),
    listAccessibleAnamnesisAnswers(submission.id),
  ]);

  const formVersion = submission.anamnesis_form_versions;
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );
  const applicableQuestionIds = getApplicableAnamnesisQuestionIds(
    questions.map((question) => ({
      id: question.id,
      applicability_source_question_id:
        question.applicability_source_question_id,
      applicability_expected_answer: question.applicability_expected_answer,
    })),
    answers.map((answer) => ({
      question_id: answer.question_id,
      answer_value: answer.answer_value,
    })),
  );
  const consentQuestion = questions.find(
    (question) =>
      question.question_key === ANAMNESIS_QUESTION_KEYS.consentAcceptance,
  );
  const questionsBySectionId = new Map<string, typeof questions>();

  for (const question of questions) {
    if (!applicableQuestionIds.has(question.id)) {
      continue;
    }

    if (
      submission.submitted_at === null &&
      question.question_key === ANAMNESIS_QUESTION_KEYS.consentAcceptance
    ) {
      continue;
    }

    const sectionQuestions = questionsBySectionId.get(question.section_id) ?? [];
    sectionQuestions.push(question);
    questionsBySectionId.set(question.section_id, sectionQuestions);
  }

  const visibleSections = sections.filter(
    (section) => (questionsBySectionId.get(section.id) ?? []).length > 0,
  );
  const draftProgress = submission.submitted_at
    ? null
    : summarizeAnamnesisDraftRequiredAnswers(
        visibleSections.flatMap((section) => questionsBySectionId.get(section.id) ?? []),
        answers,
      );

  return (
    <>
      <PageHeader
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.backLink} href="/cliente/anamnese">
              Voltar ao histórico
            </Link>
            {submission.submitted_at ? (
              <Link
                className={styles.backLink}
                href={`/cliente/anamnese/${submission.id}/esclarecimentos`}
              >
                Esclarecimentos
              </Link>
            ) : null}
          </div>
        }
        description={
          submission.submitted_at
            ? "Suas respostas originais registradas nesta versão da Anamnese."
            : "Este rascunho ainda não foi enviado. Perguntas condicionais são exibidas somente quando a resposta controladora torna o campo aplicável."
        }
        eyebrow="Cliente"
        title="Detalhe da Anamnese"
      />
      {query.saved === "1" ? (
        <Alert title="Rascunho salvo" variant="success">
          Resposta salva no rascunho.
        </Alert>
      ) : null}
      {query.submitted === "1" ? (
        <Alert live="polite" title="Anamnese enviada" variant="success">
          Suas respostas foram enviadas para análise da Patty. Este registro agora está preservado como enviado e não pode mais ser editado por você.
        </Alert>
      ) : null}
      <Section
        action={
          <Badge variant="neutral">
            {submission.submitted_at ? "Enviada" : "Rascunho"}
          </Badge>
        }
        description="Informações do registro preservado."
        title="Registro"
      >
        <Card>
          <dl className={styles.metadata}>
            <div>
              <dt>Versão do formulário</dt>
              <dd>
                {formVersion?.version_number
                  ? String(formVersion.version_number)
                  : "Definição não disponível"}
              </dd>
            </div>
            <div>
              <dt>Criada em</dt>
              <dd>{formatDateTime(submission.created_at)}</dd>
            </div>
            <div>
              <dt>Enviada em</dt>
              <dd>
                {submission.submitted_at
                  ? formatDateTime(submission.submitted_at)
                  : "Ainda não enviada"}
              </dd>
            </div>
          </dl>
        </Card>
      </Section>
      {draftProgress ? (
        <Section
          description="Resumo das respostas obrigatórias aplicáveis, calculado a partir do que já estava salvo ao abrir esta página."
          title="Preenchimento do rascunho"
        >
          <Card className={styles.progressCard}>
            <p className={styles.progressCount}>
              {draftProgress.answered} de {draftProgress.required} respostas obrigatórias salvas
            </p>
            {draftProgress.firstMissingQuestionId ? (
              <a
                className={styles.progressLink}
                href={`#pergunta-${draftProgress.firstMissingQuestionId}`}
              >
                Ir para a primeira pergunta obrigatória sem resposta
              </a>
            ) : (
              <p className={styles.progressNote}>
                Todas as perguntas obrigatórias atualmente aplicáveis têm uma resposta salva.
              </p>
            )}
            <p className={styles.progressNote}>
              Depois de novos salvamentos, atualize a página para conferir o resumo. O envio final continua sujeito à validação do banco e ao aceite exigido nesta versão.
            </p>
          </Card>
        </Section>
      ) : null}
      {visibleSections.length > 1 ? (
        <nav aria-label="Seções da Anamnese" className={styles.sectionNavigation}>
          <p className={styles.sectionNavigationTitle}>Ir para uma seção</p>
          <div className={styles.sectionNavigationLinks}>
            {visibleSections.map((section) => (
              <a
                className={styles.sectionNavigationLink}
                href={`#${section.section_key}`}
                key={section.id}
              >
                {section.title}
                {draftProgress && (draftProgress.bySection.get(section.id)?.required ?? 0) > 0 ? (
                  <span className={styles.sectionCount}>
                    {draftProgress.bySection.get(section.id)?.answered ?? 0}/{draftProgress.bySection.get(section.id)?.required ?? 0} salvas
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      <Section
        description="As perguntas abaixo pertencem à versão exata associada a este registro. Nenhuma interpretação profissional ou de IA é exibida aqui."
        title="Respostas"
      >
        {sections.length === 0 ? (
          <EmptyState
            description="A definição versionada desta Anamnese não está disponível para leitura com a autorização atual."
            title="Definição da Anamnese indisponível"
          />
        ) : visibleSections.length === 0 ? (
          <EmptyState
            description="Nenhuma pergunta se aplica às respostas atuais desta versão. Consulte a navegação ou atualize a página após salvar uma resposta condicional."
            title="Nenhuma pergunta aplicável neste momento"
          />
        ) : (
          <div className={styles.sections}>
            {visibleSections.map((section) => {
              const sectionQuestions =
                questionsBySectionId.get(section.id) ?? [];

              return (
                <section
                  className={styles.anamnesisSection}
                  id={section.section_key}
                  key={section.id}
                >
                  <div>
                    <p className={styles.sectionOrder}>
                      Seção {section.display_order}
                    </p>
                    <h2 className={styles.sectionTitle}>{section.title}</h2>
                  </div>
                  {sectionQuestions.length === 0 ? (
                    <Card variant="subtle">
                      <p className={styles.emptyText}>
                        Nenhuma pergunta está registrada nesta seção desta versão.
                      </p>
                    </Card>
                  ) : (
                    <div className={styles.questionList}>
                      {sectionQuestions.map((question) => {
                        const answer = answersByQuestionId.get(question.id);
                        const answerValue = answer?.answer_value;
                        const formattedAnswer = answer
                          ? formatAnswerValue(answerValue)
                          : "Não respondida";
                        const editableTextDraft = canEditDraftTextAnswer({
                          answerType: question.answer_type,
                          answerValue,
                          hasAnswer: Boolean(answer),
                          submittedAt: submission.submitted_at,
                        });
                        const singleChoiceOptions = getDraftSingleChoiceOptions(
                          question.options,
                        );
                        const editableSingleChoiceDraft =
                          canEditDraftSingleChoiceAnswer({
                            answerType: question.answer_type,
                            answerValue,
                            hasAnswer: Boolean(answer),
                            options: question.options,
                            submittedAt: submission.submitted_at,
                          });
                        const controlsApplicability = questions.some(
                          (candidate) =>
                            candidate.applicability_source_question_id ===
                            question.id,
                        );

                        if (editableTextDraft) {
                          return (
                            <Card className={styles.questionCard} id={`pergunta-${question.id}`} key={question.id}>
                              <ClientAnamnesisDraftTextAnswerForm
                                initialValue={
                                  typeof answerValue === "string"
                                    ? answerValue
                                    : ""
                                }
                                label={question.label}
                                questionId={question.id}
                                required={question.required}
                                submissionId={submission.id}
                              />
                            </Card>
                          );
                        }

                        if (
                          editableSingleChoiceDraft &&
                          singleChoiceOptions !== null
                        ) {
                          return (
                            <Card className={styles.questionCard} id={`pergunta-${question.id}`} key={question.id}>
                              <ClientAnamnesisDraftSingleChoiceAnswerForm
                                initialValue={
                                  typeof answerValue === "string"
                                    ? answerValue
                                    : null
                                }
                                label={question.label}
                                options={singleChoiceOptions}
                                questionId={question.id}
                                reloadPageOnSuccess={controlsApplicability}
                                required={question.required}
                                submissionId={submission.id}
                              />
                            </Card>
                          );
                        }

                        return (
                          <Card className={styles.questionCard} id={`pergunta-${question.id}`} key={question.id}>
                            <div className={styles.questionHeader}>
                              <h3 className={styles.questionLabel}>
                                {question.label}
                              </h3>
                              {question.required ? (
                                <Badge variant="neutral">
                                  Obrigatória nesta versão
                                </Badge>
                              ) : null}
                            </div>
                            <div>
                              <p className={styles.answerLabel}>
                                Sua resposta
                              </p>
                              {answer && isStructuredAnswer(answerValue) ? (
                                <pre className={styles.structuredAnswer}>
                                  {formattedAnswer}
                                </pre>
                              ) : (
                                <p className={styles.answerValue}>
                                  {formattedAnswer || "Resposta vazia"}
                                </p>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Section>
      {submission.submitted_at === null ? (
        <Section
          description="O banco valida novamente todas as respostas obrigatórias aplicáveis antes de concluir o envio."
          title="Finalizar Anamnese"
        >
          <Card>
            <ClientAnamnesisSubmitForm
              consentText={consentQuestion?.label ?? null}
              submissionId={submission.id}
            />
          </Card>
        </Section>
      ) : null}
    </>
  );
}
