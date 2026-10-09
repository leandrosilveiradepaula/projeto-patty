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
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value + "T12:00:00-03:00"));
}

function formatDateTime(value: string | null) {
  if (!value) return "Sem prazo configurado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientWeeklyFeedbackPage({ params }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) notFound();

  const [feedbacks, eligible, notificationEvents] = await Promise.all([
    listAccessibleWeeklyFeedbacksForClient(client.id),
    hasAccessibleProtocolPublicationForClient(client.id),
    listAccessibleClientNotificationEvents(client.id),
  ]);
  const reminderEventsByFeedbackId = latestReminderEventByFeedback(notificationEvents);
  const pendingFeedbacks = feedbacks.filter(
    (feedback) => feedback.submitted_at === null,
  );
  const submittedFeedbacks = feedbacks.filter(
    (feedback) => feedback.submitted_at !== null,
  );
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
        {pendingFeedbacks.length === 0 ? (
          <EmptyState
            description="Não existem solicitações abertas aguardando a cliente. Se precisar criar uma solicitação manual específica, use o formulário acima."
            title="Nenhum feedback pendente"
            action={<a href="#solicitar-feedback">Ir para solicitação</a>}
          />
        ) : (
          <ol className={styles.list}>
            {pendingFeedbacks.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const reminderEvent = reminderEventsByFeedbackId.get(feedback.id);
              const reminderStatus = describeAdminFeedbackReminder(reminderEvent);

              return (
                <li key={feedback.id}>
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
        )}
      </Section>
      </div>

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
        )}
      </Section>
    </>
  );
}
