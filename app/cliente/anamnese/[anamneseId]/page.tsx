import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  getCurrentClient,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
  listAccessibleAnamnesisSections,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type ClienteAnamneseDetailPageProps = {
  params: Promise<{
    anamneseId: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
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
}: ClienteAnamneseDetailPageProps) {
  const { anamneseId } = await params;
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
  const questionsBySectionId = new Map<string, typeof questions>();

  for (const question of questions) {
    const sectionQuestions = questionsBySectionId.get(question.section_id) ?? [];
    sectionQuestions.push(question);
    questionsBySectionId.set(question.section_id, sectionQuestions);
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/cliente/anamnese">
            Voltar ao histórico
          </Link>
        }
        description="Suas respostas originais registradas nesta versão da Anamnese."
        eyebrow="Cliente"
        title="Detalhe da Anamnese"
      />
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
      <Section
        description="As perguntas abaixo pertencem à versão exata associada a este registro. Nenhuma interpretação profissional ou de IA é exibida aqui."
        title="Respostas"
      >
        {sections.length === 0 ? (
          <EmptyState
            description="A definição versionada desta Anamnese não está disponível para leitura com a autorização atual."
            title="Definição da Anamnese indisponível"
          />
        ) : (
          <div className={styles.sections}>
            {sections.map((section) => {
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

                        return (
                          <Card className={styles.questionCard} key={question.id}>
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
    </>
  );
}
