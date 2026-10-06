import { AdminAnamnesisCorrectionForm } from "@/components/admin/AdminAnamnesisCorrectionForm";
import { AdminAnamnesisWorkspaceHeader } from "@/components/admin/AdminAnamnesisWorkspaceHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisAnswerCorrections,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";
import type { Json } from "@/lib/supabase/database.types";
import { serializeCorrectionJson } from "@/lib/anamnesis/corrections";
import { isUuid } from "@/lib/validation/uuid";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AnamnesisCorrectionsPageProps = {
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
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function formatJson(value: Json) {
  return JSON.stringify(value, null, 2);
}

export default async function AnamnesisCorrectionsPage({
  params,
}: AnamnesisCorrectionsPageProps) {
  const { anamneseId } = await params;

  if (!isUuid(anamneseId)) {
    notFound();
  }
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission) {
    notFound();
  }

  const [answers, questions] = await Promise.all([
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAnamnesisQuestions(submission.form_version_id),
  ]);
  const corrections = await listAccessibleAnamnesisAnswerCorrections(
    answers.map((answer) => answer.id),
  );

  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const correctionsByAnswerId = new Map<string, typeof corrections>();

  for (const correction of corrections) {
    const answerCorrections =
      correctionsByAnswerId.get(correction.answer_id) ?? [];
    answerCorrections.push(correction);
    correctionsByAnswerId.set(correction.answer_id, answerCorrections);
  }

  const displayName = submission.clients?.profiles?.display_name?.trim();

  return (
    <>
      <AdminAnamnesisWorkspaceHeader
        activeSection="correcoes"
        clientId={submission.client_id}
        displayName={displayName}
        submissionId={submission.id}
        submittedAt={submission.submitted_at}
      />
      <p className={styles.notice}>
        Cada correção é append-only e fica separada da resposta original. A
        resposta enviada pela cliente nunca é sobrescrita por este fluxo.
      </p>
      {!submission.submitted_at ? (
        <EmptyState
          description="Esta Anamnese ainda é um rascunho. Correções históricas só podem ser registradas depois do envio final."
          title="Correções indisponíveis"
        />
      ) : answers.length === 0 ? (
        <EmptyState
          description="Nenhuma resposta original está registrada nesta submissão."
          title="Sem respostas para corrigir"
        />
      ) : (
        <Section
          description="A lista mantém a resposta original, todas as correções anteriores e permite acrescentar uma nova correção."
          title="Respostas e correções"
        >
          <div className={styles.answerList}>
            {answers.map((answer) => {
              const question = questionsById.get(answer.question_id);
              const answerCorrections =
                correctionsByAnswerId.get(answer.id) ?? [];
              const latestValue =
                answerCorrections.at(-1)?.corrected_answer_value ??
                answer.answer_value;

              return (
                <Card className={styles.answerCard} key={answer.id}>
                  <div className={styles.answerHeader}>
                    <div>
                      <p className={styles.questionKey}>
                        {question?.question_key ?? answer.question_id}
                      </p>
                      <h2 className={styles.questionLabel}>
                        {question?.label ?? "Pergunta da versão registrada"}
                      </h2>
                    </div>
                    <Badge variant="neutral">
                      {answerCorrections.length} correção(ões)
                    </Badge>
                  </div>

                  <div>
                    <p className={styles.valueLabel}>Resposta original</p>
                    <pre className={styles.jsonValue}>
                      {formatJson(answer.answer_value)}
                    </pre>
                  </div>

                  {answerCorrections.length > 0 ? (
                    <div className={styles.history}>
                      <h3 className={styles.historyTitle}>
                        Histórico de correções
                      </h3>
                      <ol className={styles.correctionList}>
                        {answerCorrections.map((correction) => (
                          <li key={correction.id}>
                            <div className={styles.correctionMeta}>
                              <span>{formatDateTime(correction.created_at)}</span>
                              <span>
                                {correction.profiles?.display_name?.trim() ||
                                  "Patty/admin"}
                              </span>
                            </div>
                            <pre className={styles.jsonValue}>
                              {formatJson(correction.corrected_answer_value)}
                            </pre>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className={styles.noCorrections}>
                      Nenhuma correção registrada.
                    </p>
                  )}

                  <div className={styles.formArea}>
                    <h3 className={styles.historyTitle}>Adicionar correção</h3>
                    <AdminAnamnesisCorrectionForm
                      answerId={answer.id}
                      initialValue={serializeCorrectionJson(latestValue)}
                      submissionId={submission.id}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}
