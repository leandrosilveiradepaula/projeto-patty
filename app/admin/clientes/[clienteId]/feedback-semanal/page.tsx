import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { professionalFeedbackYears, readProfessionalFeedbackHistoryQuery, filterProfessionalFeedbacks, paginateProfessionalFeedbacks, professionalFeedbackHistoryHref } from "@/lib/follow-up/professional-weekly-feedback-explorer";
import { formatWeeklyFeedbackPeriodDate } from "@/lib/weekly-feedback/date-format";
import { Button } from "@/components/ui/Button";
import { orderClientWeeklyFeedbacks } from "@/lib/follow-up/client-weekly-feedback-order";
import { AdminWeeklyFeedbackRequestForm } from "@/components/admin/AdminWeeklyFeedbackRequestForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import { describeAdminFeedbackReminder } from "@/lib/operations/admin-feedback-reminder";
import { latestReminderEventByFeedback } from "@/lib/operations/feedback-reminder-order";
import { parseWeeklyFeedbackDefinition, readWeeklyFeedbackAnswer } from "@/lib/weekly-feedback/definition";
import {
  getAccessibleClient,
  hasAccessibleProtocolPublicationForClient,
  listAccessibleClientNotificationEvents,
  listAccessibleWeeklyFeedbacksForClient,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ origem?: string; ano?: string; pendentes?: string; enviados?: string; registro?: string }>;
};

const formatDate = formatWeeklyFeedbackPeriodDate;

function formatDateTime(value: string | null) {
  if (!value) return "Sem prazo configurado";
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientWeeklyFeedbackPage({ params, searchParams }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) notFound();

  const [feedbacks, eligible, notificationEvents] = await Promise.all([
    listAccessibleWeeklyFeedbacksForClient(client.id),
    hasAccessibleProtocolPublicationForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
  ]);
  const reminderEventsByFeedbackId = latestReminderEventByFeedback(notificationEvents);
  const orderedFeedbacks = orderClientWeeklyFeedbacks(feedbacks);
  const rawPendingCount=orderedFeedbacks.filter(f=>f.submitted_at===null).length;
  const rawSubmittedCount=orderedFeedbacks.length-rawPendingCount;
  const rawQuery=await searchParams;
  const years=professionalFeedbackYears(orderedFeedbacks);
  const options=readProfessionalFeedbackHistoryQuery(rawQuery,years);
  const exactPendingPage=authorizedExactRecordPage(orderedFeedbacks.filter(f=>f.submitted_at===null),rawQuery.registro,10);
  const exactSubmittedPage=authorizedExactRecordPage(orderedFeedbacks.filter(f=>f.submitted_at!==null),rawQuery.registro,10);
  // Exact record navigation ignores presentation filters that could hide the linked record.
  if (exactPendingPage!==null || exactSubmittedPage!==null) {
    options.origin="all";
    options.year="all";
    options.pendingPage=exactPendingPage??1;
    options.submittedPage=exactSubmittedPage??1;
  }
  const pendingFeedbacks=filterProfessionalFeedbacks(orderedFeedbacks,options.origin,false,options.year);
  const submittedFeedbacks=filterProfessionalFeedbacks(orderedFeedbacks,options.origin,true,options.year);
  const pendingPage=paginateProfessionalFeedbacks(pendingFeedbacks,options.pendingPage);
  const submittedPage=paginateProfessionalFeedbacks(submittedFeedbacks,options.submittedPage);
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Solicitações, respostas e lembretes"
        displayName={displayName}
        secondary="Feedbacks semanais"
        status={
          <Badge variant={eligible ? "neutral" : "warning"}>
            {eligible ? "Disponível" : "Aguardando 1º protocolo"}
          </Badge>
        }
      />

      <ClientWorkspaceNav activeArea="feedback-semanal" clientId={client.id} />
      <Section
        description="As respostas enviadas são informações para avaliação da Patty; não provocam alteração automática de protocolo."
        title="Consultar contexto do acompanhamento"
      >
        <Link href={`/admin/clientes/${client.id}/avaliacoes`}>Avaliações</Link>
        {" · "}
        <Link href={`/admin/clientes/${client.id}/checkins`}>Check-ins</Link>
        {" · "}
        <Link href={`/admin/clientes/${client.id}/protocolos`}>Protocolos</Link>
      </Section>

      <Section
        action={
          <Badge variant={eligible ? "positive" : "warning"}>
            {eligible ? "Elegível" : "Aguardando 1º protocolo"}
          </Badge>
        }
        description={
          eligible
            ? "A cliente já recebeu protocolo publicado. A agenda automática gera as solicitações elegíveis; a solicitação manual permanece disponível para necessidade operacional específica."
            : "O Feedback Semanal começa somente depois da primeira publicação de protocolo para esta cliente."
        }
        id="solicitar-feedback"
        title="Solicitar Feedback Semanal"
      >
        <Card>
          <AdminWeeklyFeedbackRequestForm
            clientId={client.id}
            eligible={eligible}
          />
        </Card>
      </Section>

      <Section title="Localizar feedbacks" description="Filtre pela origem registrada, sem alterar respostas, prazos ou automações.">
        <form method="get" action={`/admin/clientes/${client.id}/feedback-semanal`} className={styles.explorerFilters}>
          <label>Origem
            <select name="origem" defaultValue={options.origin}>
              <option value="all">Todas as origens</option>
              <option value="schedule">Automática</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>Ano<select name="ano" defaultValue={options.year}><option value="all">Todos os anos</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
          <Button type="submit" variant="secondary">Filtrar histórico</Button>
          {options.origin !== "all" || options.year !== "all" ? <Link href={`/admin/clientes/${client.id}/feedback-semanal`}>Limpar</Link> : null}
        </form>
        <p role="status">{pendingFeedbacks.length} de {rawPendingCount} pendente(s) · {submittedFeedbacks.length} de {rawSubmittedCount} enviado(s) no filtro atual.</p>
        {options.invalid || options.pendingPage > pendingPage.pageCount || options.submittedPage > submittedPage.pageCount ? (
          <p role="status">Página ou filtro inválido. Exibimos apenas registros autorizados em uma página válida.</p>
        ) : null}
      </Section>
      <div id="feedback-pendentes">
      <Section
        action={
          <Badge variant={pendingFeedbacks.length > 0 ? "warning" : "neutral"}>
            {pendingFeedbacks.length} pendente(s)
          </Badge>
        }
        description="Solicitações registradas que ainda aguardam envio da cliente. A ausência de resposta não exige revisão profissional imediata."
        title="Pendentes"
      >
        {pendingFeedbacks.length > 1 ? (
          <nav aria-label="Localizar Feedback Semanal pendente" className={styles.feedbackNavigation}>
            {pendingPage.items.map((feedback, index) => (
              <a href={`#feedback-pendente-${feedback.id}`} key={feedback.id}>
                {index + 1}. {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
              </a>
            ))}
          </nav>
        ) : null}
        {pendingFeedbacks.length === 0 ? (
          <EmptyState
            description="Não existem solicitações abertas aguardando a cliente. Se precisar criar uma solicitação manual específica, use o formulário acima."
            title="Nenhum feedback pendente"
            action={<a href="#solicitar-feedback">Ir para solicitação</a>}
          />
        ) : (
          <>
          <ol className={styles.list}>
            {pendingPage.items.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const reminderEvent = reminderEventsByFeedbackId.get(feedback.id);
              const reminderStatus = describeAdminFeedbackReminder(reminderEvent);

              return (
                <li id={`feedback-pendente-${feedback.id}`} key={feedback.id}>
                  <Card className={styles.feedbackCard}>
                    <div className={styles.header}>
                      <div>
                        <h3 className={styles.title}>
                          {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                        </h3>
                        <p className={styles.meta}>
                          {version
                            ? `${version.title} · versão ${version.version_number}`
                            : "Versão indisponível"}
                        </p>
                      </div>
                      <Badge variant="warning">Aguardando cliente</Badge>
                    </div>
                    <p className={styles.meta}>
                      Origem: {feedback.request_source === "schedule" ? "Automática" : "Manual"}
                    </p>
                    <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                    <p className={styles.reminderStatus}>
                      <strong>Lembrete:</strong>{" "}
                      {reminderStatus?.label ?? "nenhum evento de lembrete registrado."}
                       {reminderStatus?.nextStep ? (
                         <> · <Link href={`/admin/clientes/${client.id}#${reminderStatus.nextStep.anchor}`}>{reminderStatus.nextStep.label}</Link></>
                       ) : null}
                    </p>
                    <p className={styles.meta}>
                      A cliente ainda não concluiu o envio. Rascunhos não são interpretados automaticamente.
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
          {pendingPage.pageCount > 1 ? <nav aria-label="Páginas de feedbacks pendentes" className={styles.explorerPages}>
            <span>Página {pendingPage.page} de {pendingPage.pageCount}</span>
            {pendingPage.page > 1 ? <Link href={professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page-1,submittedPage:submittedPage.page},"pending")}>Anterior</Link> : null}
            {pendingPage.page < pendingPage.pageCount ? <Link href={professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page+1,submittedPage:submittedPage.page},"pending")}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>

      <div id="feedback-enviados">
      <Section
        action={<Badge variant="neutral">{submittedFeedbacks.length} enviado(s)</Badge>}
        description="Respostas efetivamente enviadas pela cliente, preservadas para consulta e decisão profissional da Patty."
        title="Histórico enviado"
      >
        {submittedFeedbacks.length === 0 ? (
          <EmptyState
            description="Ainda não há respostas enviadas pela cliente. Solicitações abertas, quando existentes, permanecem na seção Pendentes."
            title="Nenhum feedback enviado ainda"
          />
        ) : (
          <>
          <ol className={styles.historyList}>
            {submittedPage.items.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const definition = version
                ? parseWeeklyFeedbackDefinition(version.definition)
                : null;

              return (
                <li key={feedback.id}>
                  <details className={styles.historyItem} id={`feedback-enviado-${feedback.id}`}>
                    <summary>
                      <span>
                        {formatDate(feedback.period_start)} a {formatDate(feedback.period_end)}
                      </span>
                      <Badge variant="positive">Respondido</Badge>
                    </summary>
                    <div className={styles.historyContent}>
                      <p className={styles.meta}>
                        {version
                          ? `${version.title} · versão ${version.version_number}`
                          : "Versão indisponível"}
                      </p>
                      <p className={styles.meta}>
                        Origem: {feedback.request_source === "schedule" ? "Automática" : "Manual"}
                      </p>
                      <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                      {definition ? (
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
                      ) : (
                        <p className={styles.meta}>Definição do formulário indisponível.</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
          {submittedPage.pageCount > 1 ? <nav aria-label="Páginas do histórico enviado" className={styles.explorerPages}>
            <span>Página {submittedPage.page} de {submittedPage.pageCount}</span>
            {submittedPage.page > 1 ? <Link href={professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page-1},"submitted")}>Anterior</Link> : null}
            {submittedPage.page < submittedPage.pageCount ? <Link href={professionalFeedbackHistoryHref(client.id,{...options,pendingPage:pendingPage.page,submittedPage:submittedPage.page+1},"submitted")}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
      </div>
    </>
  );
}
