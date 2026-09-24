import { AdminAiReviewForm } from "@/components/admin/AdminAiReviewForm";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOpenAiProviderReadiness } from "@/lib/ai/openai-provider";
import type { Json } from "@/lib/supabase/database.types";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAiAnamnesisExecutions,
  listAccessibleAiExecutionOutputs,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ anamneseId: string }>;
};

type StoredFinding = {
  explanation: string;
  source_answer_ids: string[];
  suggested_follow_up_question?: string;
  target_question_id?: string;
  type: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStoredFindings(content: Json | undefined): StoredFinding[] {
  if (!isRecord(content) || !Array.isArray(content.findings)) {
    return [];
  }

  return content.findings.flatMap((value) => {
    if (
      !isRecord(value) ||
      typeof value.type !== "string" ||
      typeof value.explanation !== "string" ||
      !Array.isArray(value.source_answer_ids)
    ) {
      return [];
    }

    return [
      {
        type: value.type,
        explanation: value.explanation,
        source_answer_ids: value.source_answer_ids.filter(
          (id): id is string => typeof id === "string",
        ),
        ...(typeof value.target_question_id === "string"
          ? { target_question_id: value.target_question_id }
          : {}),
        ...(typeof value.suggested_follow_up_question === "string"
          ? {
              suggested_follow_up_question:
                value.suggested_follow_up_question,
            }
          : {}),
      },
    ];
  });
}

function findingLabel(type: string) {
  if (type === "possible_contradiction") return "Possível contradição";
  if (type === "clarification_needed") return "Esclarecimento sugerido";
  if (type === "missing_answer") return "Resposta aplicável ausente";
  return "Achado de IA";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminAnamnesisAiPage({ params }: PageProps) {
  const { anamneseId } = await params;
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission || !submission.submitted_at) {
    notFound();
  }

  const [questions, answers, executions] = await Promise.all([
    listAccessibleAnamnesisQuestions(submission.form_version_id),
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAiAnamnesisExecutions(submission.id),
  ]);
  const outputs = await listAccessibleAiExecutionOutputs(
    executions.map((execution) => execution.id),
  );
  const readiness = getOpenAiProviderReadiness();
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  const outputsByExecutionId = new Map(
    outputs.map((output) => [output.execution_id, output]),
  );
  const financialQuestion = questions.find(
    (question) =>
      question.question_key === "financial_capacity_for_supplements",
  );
  const financialAnswer = financialQuestion
    ? answers.find((answer) => answer.question_id === financialQuestion.id)
    : undefined;

  return (
    <>
      <PageHeader
        actions={
          <Link
            className={styles.backLink}
            href={`/admin/anamneses/${submission.id}`}
          >
            Voltar à Anamnese
          </Link>
        }
        description="A IA apenas sinaliza possíveis inconsistências, esclarecimentos e ausências aplicáveis. Patty decide o que fazer com cada achado."
        eyebrow="Administração · IA assistiva"
        title="Revisão assistida da Anamnese"
      />

      <Alert
        title="Revisão humana obrigatória"
        variant="info"
      >
        Nenhum achado cria diagnóstico, pendência, mensagem para cliente,
        protocolo ou publicação automática.
      </Alert>

      <Section
        description="A execução usa somente respostas permitidas pelo contexto minimizado e preserva a versão exata do prompt, modelo e fontes."
        title="Nova execução"
      >
        <Card>
          <AdminAiReviewForm
            financialAnswerId={financialAnswer?.id ?? null}
            model={readiness.ready ? readiness.model : null}
            providerReady={readiness.ready}
            submissionId={submission.id}
          />
        </Card>
      </Section>

      <Section
        description="Histórico imutável das execuções desta Anamnese."
        title="Histórico da IA"
      >
        {executions.length === 0 ? (
          <EmptyState
            description="Ainda não existe execução de IA para esta Anamnese."
            title="Sem análises assistidas"
          />
        ) : (
          <div className={styles.stack}>
            {executions.map((execution) => {
              const output = outputsByExecutionId.get(execution.id);
              const findings = readStoredFindings(output?.content);

              return (
                <Card className={styles.entry} key={execution.id}>
                  <div className={styles.entryHeader}>
                    <h2 className={styles.title}>
                      {execution.provider} · {execution.model_identifier}
                    </h2>
                    <Badge variant="neutral">{execution.status}</Badge>
                  </div>

                  <p className={styles.meta}>
                    Iniciada em {formatDateTime(execution.created_at)}
                  </p>

                  {execution.status === "failed" ? (
                    <Alert title="Execução falhou" variant="warning">
                      {execution.failure_message ??
                        "A falha foi registrada sem publicar nenhum resultado."}
                    </Alert>
                  ) : null}

                  {execution.status === "completed" &&
                  findings.length === 0 ? (
                    <p className={styles.text}>
                      Execução concluída sem achados para revisão.
                    </p>
                  ) : null}

                  {findings.map((finding, index) => {
                    const sourceLabels = finding.source_answer_ids.map(
                      (answerId) => {
                        const answer = answersById.get(answerId);
                        return answer
                          ? questionsById.get(answer.question_id)?.label ??
                              "Resposta da Anamnese"
                          : "Resposta da Anamnese";
                      },
                    );
                    const targetLabel = finding.target_question_id
                      ? questionsById.get(finding.target_question_id)?.label
                      : undefined;

                    return (
                      <div
                        className={styles.finding}
                        key={`${execution.id}-${index}`}
                      >
                        <h3 className={styles.title}>
                          {findingLabel(finding.type)}
                        </h3>
                        <p className={styles.text}>{finding.explanation}</p>
                        {sourceLabels.length > 0 ? (
                          <ul className={styles.list}>
                            {sourceLabels.map((label, sourceIndex) => (
                              <li key={`${label}-${sourceIndex}`}>{label}</li>
                            ))}
                          </ul>
                        ) : null}
                        {targetLabel ? (
                          <p className={styles.meta}>
                            Pergunta relacionada: {targetLabel}
                          </p>
                        ) : null}
                        {finding.suggested_follow_up_question ? (
                          <p className={styles.suggested}>
                            Sugestão interna:{" "}
                            {finding.suggested_follow_up_question}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
