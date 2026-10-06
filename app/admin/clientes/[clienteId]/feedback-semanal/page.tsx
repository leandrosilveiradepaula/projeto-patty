import { AdminWeeklyFeedbackRequestForm } from "@/components/admin/AdminWeeklyFeedbackRequestForm";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
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

function notificationStatusLabel(
  event:
    | {
        blocked_reason: string | null;
        channel_key: string | null;
        delivery_state: string;
      }
    | undefined,
) {
  if (!event) return null;

  if (event.delivery_state === "delivered" && event.channel_key === "in_app") {
    return "Lembrete disponível no app";
  }

  if (event.delivery_state === "delivered" && event.channel_key === "email") {
    return "Lembrete entregue por email";
  }

  if (event.delivery_state === "queued_external" && event.channel_key === "email") {
    return "Lembrete por email aguardando envio";
  }

  if (event.delivery_state === "delivery_failed" && event.channel_key === "email") {
    return "Falha no envio do lembrete por email";
  }

  if (event.delivery_state === "blocked_no_channel") {
    return "Lembrete bloqueado: canal não configurado";
  }

  if (event.delivery_state === "blocked_missing_contact") {
    return event.channel_key === "email"
      ? "Lembrete bloqueado: email de contato ausente"
      : "Lembrete bloqueado: telefone ausente";
  }

  if (event.delivery_state === "blocked_provider") {
    return event.channel_key === "email"
      ? "Email configurado; entrega externa ainda não concluída"
      : "WhatsApp configurado; provedor externo ainda não ativado";
  }

  return "Lembrete registrado";
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
  const reminderEventsByFeedbackId = new Map<
    string,
    (typeof notificationEvents)[number]
  >();

  for (const event of notificationEvents) {
    if (
      (
        event.event_key.startsWith("weekly_feedback_reminder:") ||
        event.event_key.startsWith("weekly_feedback_email_delivery:") ||
        event.event_key.startsWith("weekly_feedback_email_delivery_failed:")
      ) &&
      !reminderEventsByFeedbackId.has(event.weekly_feedback_id)
    ) {
      reminderEventsByFeedbackId.set(event.weekly_feedback_id, event);
    }
  }
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Acompanhamento ativo"
        displayName={displayName}
        secondary="Feedbacks semanais"
        status={<Badge variant="neutral">Acompanhamento ativo</Badge>}
      />

      <ClientWorkspaceNav clientId={client.id} />

      <Section
        action={
          <Badge variant={eligible ? "positive" : "warning"}>
            {eligible ? "Elegível" : "Aguardando 1º protocolo"}
          </Badge>
        }
        description={
          eligible
            ? "A cliente já recebeu protocolo publicado. A solicitação manual usa a versão publicada atual enquanto a agenda automática termina de ser parametrizada."
            : "O Feedback Semanal começa somente depois da primeira publicação de protocolo para esta cliente."
        }
        title="Solicitar Feedback Semanal"
      >
        <Card>
          <AdminWeeklyFeedbackRequestForm
            clientId={client.id}
            eligible={eligible}
          />
        </Card>
      </Section>

      <Section
        action={<Badge variant="neutral">{feedbacks.length} registro(s)</Badge>}
        description="Histórico real das solicitações desta cliente."
        title="Histórico"
      >
        {feedbacks.length === 0 ? (
          <EmptyState
            description="Crie a primeira solicitação acima."
            title="Nenhum Feedback Semanal registrado"
          />
        ) : (
          <ol className={styles.list}>
            {feedbacks.map((feedback) => {
              const version = feedback.weekly_feedback_form_versions;
              const definition = version
                ? parseWeeklyFeedbackDefinition(version.definition)
                : null;

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
                      <Badge variant={feedback.submitted_at ? "positive" : "warning"}>
                        {feedback.submitted_at ? "Respondido" : "Aguardando cliente"}
                      </Badge>
                    </div>
                    <p className={styles.meta}>
                      Origem: {feedback.request_source === "schedule" ? "Automática" : "Manual"}
                    </p>
                    <p className={styles.meta}>Prazo: {formatDateTime(feedback.due_at)}</p>
                    {feedback.submitted_at && definition ? (
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
                      <p className={styles.meta}>
                        A cliente ainda não concluiu o envio. Rascunhos não são interpretados automaticamente.
                      </p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
