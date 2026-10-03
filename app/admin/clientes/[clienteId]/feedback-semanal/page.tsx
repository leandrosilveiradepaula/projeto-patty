import { createWeeklyFeedbackRequestAction } from "@/app/admin/clientes/[clienteId]/feedback-semanal/actions";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { parseWeeklyFeedbackDefinition, readWeeklyFeedbackAnswer } from "@/lib/weekly-feedback/definition";
import {
  getAccessibleClient,
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

  const feedbacks = await listAccessibleWeeklyFeedbacksForClient(client.id);
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Feedbacks semanais"
        status={<Badge variant="neutral">Acompanhamento ativo</Badge>}
      />

      <ClientWorkspaceNav clientId={client.id} />

      <Section
        description="Cria uma solicitação usando a versão publicada atual. Agenda automática e canais externos ainda não são executados nesta etapa."
        title="Solicitar Feedback Semanal"
      >
        <Card>
          <form
            action={createWeeklyFeedbackRequestAction.bind(null, client.id)}
            className={styles.form}
          >
            <label className={styles.field}>
              <span>Semana de referência · início</span>
              <TextInput name="periodStart" required type="date" />
            </label>
            <label className={styles.field}>
              <span>Semana de referência · fim</span>
              <TextInput name="periodEnd" required type="date" />
            </label>
            <label className={styles.field}>
              <span>Prazo para resposta</span>
              <TextInput name="dueAt" type="datetime-local" />
            </label>
            <Button type="submit">Criar solicitação</Button>
          </form>
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
                        {feedback.submitted_at ? "Respondido" : "Pendente"}
                      </Badge>
                    </div>
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
