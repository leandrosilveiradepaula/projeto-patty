import { clientInAppFeedbackNotices } from "@/lib/notifications/client-in-app-inbox";
import { availableClientFeedbackHistoryYears, readClientFeedbackHistoryQuery, exploreClientFeedbackHistory, clientFeedbackHistoryHref, formatClientFeedbackHistoryMonth, CLIENT_FEEDBACK_HISTORY_PAGE_SIZE } from "@/lib/follow-up/client-weekly-feedback-explorer";
import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { Button } from "@/components/ui/Button";
import { fingerprintWeeklyFeedbackAnswers } from "@/lib/weekly-feedback/draft-fingerprint";
import { ClientHistoryDisclosure } from "@/components/client/ClientHistoryDisclosure";
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

import { formatWeeklyFeedbackPeriodDate, formatWeeklyFeedbackDueDate } from "@/lib/weekly-feedback/date-format";

const formatDate = formatWeeklyFeedbackPeriodDate;
const formatDueAt = formatWeeklyFeedbackDueDate;

export default async function ClientWeeklyFeedbackPage({ searchParams }: { searchParams: Promise<{ origem?: string | string[]; ano?: string | string[]; mes?: string | string[]; pagina?: string | string[]; registro?: string | string[] }> }) {
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
  // Use the same client-scoped, delivered-only projection as the inbox.
  // An event alone must not imply a reminder for a different feedback.
  const inAppReminderFeedbackIds = new Set(
    clientInAppFeedbackNotices(notificationEvents, feedbacks, client.id)
      .filter((notice) => notice.status === "pending")
      .map((notice) => notice.feedback.id),
  );
  const orderedFeedbacks = orderClientWeeklyFeedbacks(feedbacks);
  const pendingFeedbacks = orderedFeedbacks.filter(
    (feedback) => feedback.submitted_at === null,
  );
  const submittedFeedbacks = orderedFeedbacks.filter(
    (feedback) => feedback.submitted_at !== null,
  );

  const rawQuery = await searchParams;
  const years = availableClientFeedbackHistoryYears(submittedFeedbacks);
  const historyFilters = readClientFeedbackHistoryQuery(rawQuery, years);
  // An ID in the URL never proves submission or grants access. Resolve it only
  // inside the signed-in client's RLS-scoped, definitively submitted records.
  const exactSubmittedPage = authorizedExactRecordPage(
    submittedFeedbacks, rawQuery.registro, CLIENT_FEEDBACK_HISTORY_PAGE_SIZE,
  );
  const confirmedFeedback = exactSubmittedPage === null
    ? null : submittedFeedbacks.find((feedback) => feedback.id === rawQuery.registro) ?? null;
  if (exactSubmittedPage !== null) {
    // A previously selected year, month or page cannot hide the exact receipt.
    historyFilters.origin = "all";
    historyFilters.year = "all";
    historyFilters.month = "all";
    historyFilters.page = exactSubmittedPage;
    historyFilters.invalid = false;
  }
  const submittedHistory = exploreClientFeedbackHistory(submittedFeedbacks, historyFilters);
  return (
    <>
      <PageHeader
        description="Responda o acompanhamento referente à semana indicada. Salvar rascunho não envia suas respostas; somente Enviar feedback conclui o registro."
        eyebrow="Cliente"
        title="Feedback Semanal"
      />
      {confirmedFeedback ? (
        <Alert title="Envio confirmado" variant="success" live="polite">
          O Feedback Semanal de {formatDate(confirmedFeedback.period_start)} a {formatDate(confirmedFeedback.period_end)}
          {" "}está enviado e preservado no histórico. A Patty poderá consultar suas respostas;
          isso não significa que já foram revisadas.{" "}
          <Link href="/cliente/feedback-semanal#historico-enviado">Ver todo o histórico</Link>.
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
            description="Respostas ainda não enviadas. Abra a semana desejada para continuar um rascunho ou concluir o envio."
            title="Pendentes"
          >
            {pendingFeedbacks.length > 1 ? (
              <nav aria-label="Ir para Feedback Semanal pendente" className={styles.feedbackNavigation}>
                {pendingFeedbacks.map((feedback, index) => (
                  <a href={`#feedback-pendente-${feedback.id}`} key={feedback.id}>
                    {index + 1}. Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                  </a>
                ))}
              </nav>
            ) : null}
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
                    <li key={feedback.id}>
                      <ClientHistoryDisclosure
                        className={styles.pendingItem}
                        defaultOpen={feedbackIndex === 0}
                        id={`feedback-pendente-${feedback.id}`}
                        summary={<span className={styles.pendingSummary}>
                          <span>
                            Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                          </span>
                          <Badge variant="warning">
                            {feedbackIndex === 0 ? "Responder agora" : "Pendente"}
                          </Badge>
                        </span>}
                      >
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
                            key={feedback.id}
                            expectedFingerprint={fingerprintWeeklyFeedbackAnswers(feedback.answers)}
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
                      </ClientHistoryDisclosure>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          <Section
            id="historico-enviado"
            action={<Badge variant="neutral">{submittedFeedbacks.length} enviado(s)</Badge>}
            description="Consulte respostas já enviadas. Esses registros permanecem preservados e não podem ser editados por aqui."
            title="Histórico enviado"
          >
            {submittedFeedbacks.length > 0 ? (
              <>
              <form className={styles.historyFilters} action="/cliente/feedback-semanal" method="get">
                <label>Origem
                  <select name="origem" defaultValue={historyFilters.origin}>
                    <option value="all">Todas</option>
                    <option value="manual">Manual</option>
                    <option value="schedule">Automática</option>
                  </select>
                </label>
                <label>Ano
                  <select name="ano" defaultValue={historyFilters.year}>
                    <option value="all">Todos os anos</option>
                    {years.map(year => <option value={year} key={year}>{year}</option>)}
                  </select>
                </label>
                <label>Mês
                  <select name="mes" defaultValue={historyFilters.month}>
                    <option value="all">Todos os meses</option>
                    {Array.from({ length: 12 }, (_, month) => String(month + 1).padStart(2, "0")).map(month => (
                      <option key={month} value={month}>{formatClientFeedbackHistoryMonth(month)}</option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="secondary">Filtrar</Button>
                {(historyFilters.origin!=="all"||historyFilters.year!=="all"||historyFilters.month!=="all") ? <Link href="/cliente/feedback-semanal#historico-enviado">Limpar</Link> : null}
              </form>
              <p role="status">{submittedHistory.total} de {submittedFeedbacks.length} resposta(s) encontrada(s).</p>
              {historyFilters.invalid || historyFilters.page>submittedHistory.pages ? <Alert title="Consulta ajustada" variant="info">Exibindo somente histórico disponível nesta conta.</Alert> : null}
              </>
            ) : null}
            {submittedFeedbacks.length === 0 ? (
              <EmptyState
                description="Ainda não existe Feedback Semanal enviado no histórico. Respostas futuras ficarão preservadas aqui para consulta."
                title="Nenhum feedback enviado ainda"
              />
            ) : submittedHistory.total === 0 ? (
              <EmptyState title="Nenhuma resposta encontrada" description="Não há feedbacks enviados com os filtros selecionados." action={<Link href="/cliente/feedback-semanal#historico-enviado">Ver histórico completo</Link>} />
            ) : (
              <>
              <ol className={styles.historyList}>
                {submittedHistory.items.map((feedback) => {
                  const version = feedback.weekly_feedback_form_versions;
                  const definition = version
                    ? parseWeeklyFeedbackDefinition(version.definition)
                    : null;

                  return (
                    <li key={feedback.id}>
                      <ClientHistoryDisclosure className={styles.historyItem} id={`feedback-enviado-${feedback.id}`} summary={<><span>Semana de {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}</span><Badge variant="positive">Enviado</Badge></>}>

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
                      </ClientHistoryDisclosure>
                    </li>
                  );
                })}
              </ol>
              {submittedHistory.pages > 1 ? (
                <nav className={styles.historyPages} aria-label="Páginas do histórico enviado">
                  <span>Página {submittedHistory.page} de {submittedHistory.pages}</span>
                  {submittedHistory.page > 1 ? <Link href={clientFeedbackHistoryHref(historyFilters, submittedHistory.page - 1)}>Anterior</Link> : null}
                  {submittedHistory.page < submittedHistory.pages ? <Link href={clientFeedbackHistoryHref(historyFilters, submittedHistory.page + 1)}>Próxima</Link> : null}
                </nav>
              ) : null}
              </>
            )}
          </Section>
        </>
      )}
      <ClientJourneyNextSteps areas={["notices","checkins","protocol","index"]} />
    </>
  );
}