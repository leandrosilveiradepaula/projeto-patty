import { saveWeeklyFeedbackAction } from "@/app/cliente/feedback-semanal/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  parseWeeklyFeedbackDefinition,
  readWeeklyFeedbackAnswer,
} from "@/lib/weekly-feedback/definition";
import {
  getCurrentClient,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
} from "@/lib/supabase/data-access";
import styles from "./page.module.css";
import Link from "next/link";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value + "T12:00:00-03:00"));
}

function formatDueAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

type ClientWeeklyFeedbackPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ClientWeeklyFeedbackPage({
  searchParams,
}: ClientWeeklyFeedbackPageProps) {
  const { status } = await searchParams;
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Feedback Semanal indisponível"
      />
    );
  }

  const [feedbacks, notificationEvents] = await Promise.all([
    listAccessibleWeeklyFeedbacksForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
  ]);
  const inAppReminderFeedbackIds = new Set(
    notificationEvents
      .filter(
        (event) =>
          event.event_key.startsWith("weekly_feedback_reminder:") &&
          event.channel_key === "in_app" &&
          event.delivery_state === "delivered",
      )
      .map((event) => event.weekly_feedback_id),
  );
  const pendingFeedbacks = feedbacks.filter(
    (feedback) => feedback.submitted_at === null,
  );
  const submittedFeedbacks = feedbacks.filter(
    (feedback) => feedback.submitted_at !== null,
  );

  return (
    <>
      <PageHeader
        description="Responda o acompanhamento referente à semana indicada. Você pode salvar um rascunho e concluir depois."
        eyebrow="Cliente"
        title="Feedback Semanal"
      />
      {status === "draft-saved" ? (
        <Alert live="polite" title="Rascunho salvo" variant="success">
          Suas respostas foram salvas. Você pode continuar em outro momento.
        </Alert>
      ) : status === "submitted" ? (
        <Alert live="polite" title="Feedback enviado" variant="success">
          Seu Feedback Semanal foi enviado e não está mais disponível para edição.
        </Alert>
      ) : status === "invalid" ? (
        <Alert live="assertive" title="Revise suas respostas" variant="critical">
          Preencha as perguntas obrigatórias e confira os campos numéricos antes de enviar.
        </Alert>
      ) : status === "save-error" ? (
        <Alert live="assertive" title="Não foi possível salvar" variant="critical">
          O sistema não conseguiu gravar seu Feedback Semanal. Tente novamente antes de sair desta página.
        </Alert>
      ) : null}

      {feedbacks.length === 0 ? (
        <Section title="Seus feedbacks">
          <EmptyState
            description="Ainda não existe um Feedback Semanal disponível para responder. Quando a solicitação estiver registrada, ela aparecerá aqui."
            title="Nenhum feedback solicitado"
            action={<Link href="/cliente">Voltar ao início</Link>}
          />
        </Section>
      ) : (
        <>
          <Section
            action={<Badge variant={pendingFeedbacks.length > 0 ? "warning" : "neutral"}>{pendingFeedbacks.length} pendente(s)</Badge>}
            description="Feedbacks que ainda podem ser preenchidos e enviados."
            title="Pendentes"
          >
            {pendingFeedbacks.length === 0 ? (
              <EmptyState
                description="Você não possui Feedback Semanal pendente neste momento."
                title="Tudo enviado"
              />
            ) : (
              <ol className={styles.list}>
                {pendingFeedbacks.map((feedback, feedbackIndex) => {
                  const version = feedback.weekly_feedback_form_versions;
                  const definition = version
                    ? parseWeeklyFeedbackDefinition(version.definition)
                    : null;

                  return (
                    <li key={feedback.id}>
                      <details
                        className={styles.pendingItem}
                        open={feedbackIndex === 0}
                      >
                        <summary className={styles.pendingSummary}>
                          <span>
                            Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                          </span>
                          <Badge variant="warning">
                            {feedbackIndex === 0 ? "Responder agora" : "Pendente"}
                          </Badge>
                        </summary>
                        <div className={styles.pendingContent}>
                      <Card className={styles.card}>
                        {inAppReminderFeedbackIds.has(feedback.id) ? (
                          <Alert title="Lembrete do Feedback Semanal" variant="info">
                            Seu Feedback Semanal desta semana ainda está pendente. Você
                            pode continuar o preenchimento e enviar quando concluir.
                          </Alert>
                        ) : null}
                        <div className={styles.header}>
                          <div>
                            <h2 className={styles.title}>
                              Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                            </h2>
                            {feedback.due_at ? (
                              <p className={styles.meta}>
                                Prazo: {formatDueAt(feedback.due_at)}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant="warning">Pendente</Badge>
                        </div>

                        {!definition ? (
                          <p className={styles.meta}>Definição do formulário indisponível.</p>
                        ) : (
                          <form
                            action={saveWeeklyFeedbackAction.bind(null, feedback.id)}
                            className={styles.form}
                          >
                            {definition.questions.map((question) => {
                              const defaultValue = readWeeklyFeedbackAnswer(
                                feedback.answers,
                                question.key,
                              );

                              return (
                                <label className={styles.field} key={question.key}>
                                  <span>{question.label}</span>
                                  {question.allowsNotApplicable ? (
                                    <small>Quando não se aplicar ao seu protocolo, escreva “Não se aplica”.</small>
                                  ) : null}
                                  {question.inputType === "text" ? (
                                    <Textarea
                                      defaultValue={defaultValue}
                                      name={question.key}
                                      required={question.required}
                                      rows={3}
                                    />
                                  ) : (
                                    <TextInput
                                      defaultValue={defaultValue}
                                      max={question.inputType === "rating_0_10" ? 10 : undefined}
                                      min={0}
                                      name={question.key}
                                      required={question.required}
                                      step={1}
                                      type="number"
                                    />
                                  )}
                                </label>
                              );
                            })}
                            <div className={styles.actions}>
                              <Button formNoValidate name="intent" type="submit" value="save" variant="secondary">
                                Salvar rascunho
                              </Button>
                              <Button name="intent" type="submit" value="submit">
                                Enviar feedback
                              </Button>
                            </div>
                          </form>
                        )}
                      </Card>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          <Section
            action={<Badge variant="neutral">{submittedFeedbacks.length} enviado(s)</Badge>}
            description="Feedbacks já enviados ficam preservados e podem ser consultados quando você precisar."
            title="Histórico enviado"
          >
            {submittedFeedbacks.length === 0 ? (
              <EmptyState
                description="Depois que você enviar um Feedback Semanal, ele aparecerá aqui."
                title="Nenhum feedback enviado ainda"
              />
            ) : (
              <ol className={styles.historyList}>
                {submittedFeedbacks.map((feedback) => {
                  const version = feedback.weekly_feedback_form_versions;
                  const definition = version
                    ? parseWeeklyFeedbackDefinition(version.definition)
                    : null;

                  return (
                    <li key={feedback.id}>
                      <details className={styles.historyItem}>
                        <summary>
                          <span>
                            Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                          </span>
                          <Badge variant="positive">Enviado</Badge>
                        </summary>
                        <div className={styles.historyContent}>
                          {feedback.due_at ? (
                            <p className={styles.meta}>
                              Prazo original: {formatDueAt(feedback.due_at)}
                            </p>
                          ) : null}
                          {!definition ? (
                            <p className={styles.meta}>Definição do formulário indisponível.</p>
                          ) : (
                            <dl className={styles.answers}>
                              {definition.questions.map((question) => (
                                <div key={question.key}>
                                  <dt>{question.label}</dt>
                                  <dd>
                                    {readWeeklyFeedbackAnswer(feedback.answers, question.key) || "Sem resposta"}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </>
      )}
    </>
  );
}