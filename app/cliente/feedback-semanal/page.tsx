import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientWeeklyFeedbackResponseForm } from "./ClientWeeklyFeedbackResponseForm";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
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
import { orderClientWeeklyFeedbacks } from "@/lib/follow-up/client-weekly-feedback-order";

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

export default async function ClientWeeklyFeedbackPage() {
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
  const orderedFeedbacks = orderClientWeeklyFeedbacks(feedbacks);
  const pendingFeedbacks = orderedFeedbacks.filter(
    (feedback) => feedback.submitted_at === null,
  );
  const submittedFeedbacks = orderedFeedbacks.filter(
    (feedback) => feedback.submitted_at !== null,
  );

  return (
    <>
      <PageHeader
        description="Responda o acompanhamento referente à semana indicada. Salvar rascunho não envia suas respostas; somente Enviar feedback conclui o registro."
        eyebrow="Cliente"
        title="Feedback Semanal"
      />
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
            description="Respostas ainda não enviadas. Abra a semana desejada para continuar um rascunho ou concluir o envio."
            title="Pendentes"
          >
            {pendingFeedbacks.length === 0 ? (
              <EmptyState
                description="Não há Feedback Semanal aguardando sua resposta neste momento. Novas solicitações aparecerão aqui quando estiverem disponíveis."
                title="Nenhuma resposta pendente"
              />
            ) : (
              <ol className={styles.list}>
                {pendingFeedbacks.map((feedback, feedbackIndex) => {
                  const version = feedback.weekly_feedback_form_versions;
                  const definition = version
                    ? parseWeeklyFeedbackDefinition(version.definition)
                    : null;

                  return (
                    <li id={`feedback-pendente-${feedback.id}`} key={feedback.id}>
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
                          <ClientWeeklyFeedbackResponseForm
                            feedbackId={feedback.id}
                            initialValues={Object.fromEntries(
                              definition.questions.map((question) => [
                                question.key,
                                readWeeklyFeedbackAnswer(feedback.answers, question.key),
                              ]),
                            )}
                            questions={definition.questions}
                          />
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
            description="Consulte respostas já enviadas. Esses registros permanecem preservados e não podem ser editados por aqui."
            title="Histórico enviado"
          >
            {submittedFeedbacks.length === 0 ? (
              <EmptyState
                description="Ainda não existe Feedback Semanal enviado no histórico. Respostas futuras ficarão preservadas aqui para consulta."
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
      <ClientJourneyNextSteps areas={["checkins","protocol","index"]} />
    </>
  );
}