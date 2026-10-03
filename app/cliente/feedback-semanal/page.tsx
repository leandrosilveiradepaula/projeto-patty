import { saveWeeklyFeedbackAction } from "@/app/cliente/feedback-semanal/actions";
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
  listAccessibleWeeklyFeedbacksForClient,
} from "@/lib/supabase/data-access";
import styles from "./page.module.css";

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

  const feedbacks = await listAccessibleWeeklyFeedbacksForClient(client.id);

  return (
    <>
      <PageHeader
        description="Responda o acompanhamento referente à semana indicada. Você pode salvar um rascunho e concluir depois."
        eyebrow="Cliente"
        title="Feedback Semanal"
      />

      <Section title="Seus feedbacks">
        {feedbacks.length === 0 ? (
          <EmptyState
            description="Quando a Patty solicitar um feedback, ele aparecerá aqui."
            title="Nenhum feedback solicitado"
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
                  <Card className={styles.card}>
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
                      <Badge variant={feedback.submitted_at ? "positive" : "warning"}>
                        {feedback.submitted_at ? "Enviado" : "Pendente"}
                      </Badge>
                    </div>

                    {!definition ? (
                      <p className={styles.meta}>Definição do formulário indisponível.</p>
                    ) : feedback.submitted_at ? (
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
                          <Button name="intent" type="submit" value="save" variant="secondary">
                            Salvar rascunho
                          </Button>
                          <Button name="intent" type="submit" value="submit">
                            Enviar feedback
                          </Button>
                        </div>
                      </form>
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
