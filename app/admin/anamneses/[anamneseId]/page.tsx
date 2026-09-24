import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
  listAccessibleAnamnesisReviews,
  listAccessibleAnamnesisSections,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminAnamnesisDetailPageProps = {
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

export default async function AdminAnamnesisDetailPage({
  params,
}: AdminAnamnesisDetailPageProps) {
  const { anamneseId } = await params;
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission) {
    notFound();
  }

  const [sections, questions, answers, reviews] = await Promise.all([
    listAccessibleAnamnesisSections(submission.form_version_id),
    listAccessibleAnamnesisQuestions(submission.form_version_id),
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAnamnesisReviews(submission.id),
  ]);

  const displayName = submission.clients?.profiles?.display_name?.trim();
  const formVersion = submission.anamnesis_form_versions;
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  );
  const questionsBySectionId = new Map<
    string,
    typeof questions
  >();

  for (const question of questions) {
    const sectionQuestions = questionsBySectionId.get(question.section_id) ?? [];
    sectionQuestions.push(question);
    questionsBySectionId.set(question.section_id, sectionQuestions);
  }

  return (
    <>
      <PageHeader
        actions={
          <div className={styles.headerActions}>
            <Link
              className={styles.backLink}
              href={`/admin/clientes/${submission.client_id}/anamnese`}
            >
              Voltar ao histórico
            </Link>
            <Link
              className={styles.backLink}
              href={`/admin/anamneses/${submission.id}/revisao`}
            >
              Revisões ({reviews.length})
            </Link>
            {submission.submitted_at ? (
              <>
                <Link
                  className={styles.backLink}
                  href={`/admin/anamneses/${submission.id}/ia`}
                >
                  Análise IA
                </Link>
                <Link
                  className={styles.backLink}
                  href={`/admin/anamneses/${submission.id}/esclarecimentos`}
                >
                  Esclarecimentos
                </Link>
                <Link
                  className={styles.backLink}
                  href={`/admin/anamneses/${submission.id}/correcoes`}
                >
                  Correções
                </Link>
              </>
            ) : null}
          </div>
        }
        description="Leitura administrativa das respostas originais preservadas no backend, sem interpretação automática."
        eyebrow="Administração"
        title={displayName ? `Anamnese de ${displayName}` : "Detalhe da Anamnese"}
      />
      <Section
        action={
          <Badge variant="neutral">
            {submission.submitted_at ? "Enviada" : "Rascunho"}
          </Badge>
        }
        description="Metadados factuais da submissão e da versão de formulário vinculada."
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
            <div>
              <dt>Identificador</dt>
              <dd>{submission.id}</dd>
            </div>
          </dl>
        </Card>
      </Section>
      <Section
        description="Seções e perguntas carregadas da versão exata registrada na submissão. Ausência de resposta é exibida como fato, sem inferência."
        title="Respostas originais"
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
                              <div>
                                <p className={styles.questionKey}>
                                  {question.question_key}
                                </p>
                                <h3 className={styles.questionLabel}>
                                  {question.label}
                                </h3>
                              </div>
                              {question.required ? (
                                <Badge variant="neutral">Obrigatória nesta versão</Badge>
                              ) : null}
                            </div>
                            <div>
                              <p className={styles.answerLabel}>
                                Resposta da cliente
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
