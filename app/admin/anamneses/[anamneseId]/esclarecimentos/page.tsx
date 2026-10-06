import { resolveAnamnesisClarificationRequest } from "@/app/admin/anamneses/[anamneseId]/esclarecimentos/actions";
import { AdminAnamnesisClarificationRequestForm } from "@/components/admin/AdminAnamnesisClarificationRequestForm";
import { AdminAnamnesisWorkspaceHeader } from "@/components/admin/AdminAnamnesisWorkspaceHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisClarificationRequests,
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type PageProps = { params: Promise<{ anamneseId: string }> };

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatAnswer(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default async function AdminAnamnesisClarificationsPage({ params }: PageProps) {
  const { anamneseId } = await params;
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);
  if (!submission || !submission.submitted_at) notFound();

  const [answers, questions, requests] = await Promise.all([
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAnamnesisQuestions(submission.form_version_id),
    listAccessibleAnamnesisClarificationRequests(submission.id),
  ]);
  const requestIds = requests.map((request) => request.id);
  const [responses, resolutions] = await Promise.all([
    listAccessibleAnamnesisClarificationResponses(requestIds),
    listAccessibleAnamnesisClarificationResolutions(requestIds),
  ]);
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const responsesByRequestId = new Map<string, typeof responses>();
  const resolutionByRequestId = new Map(
    resolutions.map((resolution) => [
      resolution.clarification_request_id,
      resolution,
    ]),
  );

  for (const response of responses) {
    const entries = responsesByRequestId.get(response.clarification_request_id) ?? [];
    entries.push(response);
    responsesByRequestId.set(response.clarification_request_id, entries);
  }

  const sourceAnswers = answers.map((answer) => ({
    id: answer.id,
    label: questionsById.get(answer.question_id)?.label ?? `Resposta ${answer.id.slice(0, 8)}`,
  }));

  return (
    <>
      <AdminAnamnesisWorkspaceHeader
        activeSection="esclarecimentos"
        clientId={submission.client_id}
        displayName={submission.clients?.profiles?.display_name}
        submissionId={submission.id}
        submittedAt={submission.submitted_at}
      />
      <p className={styles.notice}>
        Este fluxo não altera a resposta original. A resposta da cliente não resolve o pedido automaticamente; a Patty precisa revisar e marcar como resolvido.
      </p>
      <Section description="O vínculo com uma resposta original é opcional." title="Novo pedido">
        <Card>
          <AdminAnamnesisClarificationRequestForm sourceAnswers={sourceAnswers} submissionId={submission.id} />
        </Card>
      </Section>
      <Section description="Histórico cronológico de pedidos e complementos." title="Histórico">
        {requests.length === 0 ? (
          <EmptyState description="Nenhum pedido de esclarecimento foi registrado para esta Anamnese." title="Sem esclarecimentos" />
        ) : (
          <div className={styles.list}>
            {requests.map((request) => {
              const sourceAnswer = request.source_answer_id ? answersById.get(request.source_answer_id) : undefined;
              const sourceQuestion = sourceAnswer ? questionsById.get(sourceAnswer.question_id) : undefined;
              const requestResponses = responsesByRequestId.get(request.id) ?? [];
              const resolution = resolutionByRequestId.get(request.id);
              const statusLabel = resolution
                ? "Resolvido"
                : requestResponses.length > 0
                  ? "Resposta recebida"
                  : "Aguardando cliente";
              return (
                <Card className={styles.entry} key={request.id}>
                  <div className={styles.entryHeader}>
                    <h2 className={styles.entryTitle}>Pedido da Patty</h2>
                    <div className={styles.statusGroup}>
                      <Badge variant="neutral">{statusLabel}</Badge>
                      <Badge variant="neutral">{formatDateTime(request.created_at)}</Badge>
                    </div>
                  </div>
                  <p className={styles.text}>{request.request_text}</p>
                  {sourceAnswer ? (
                    <div className={styles.original}>
                      <p className={styles.originalLabel}>Resposta original relacionada</p>
                      <p className={styles.meta}>{sourceQuestion?.label ?? "Pergunta da Anamnese"}</p>
                      <p className={styles.text}>{formatAnswer(sourceAnswer.answer_value)}</p>
                    </div>
                  ) : null}
                  <div className={styles.responses}>
                    {requestResponses.length === 0 ? (
                      <p className={styles.emptyText}>Nenhum complemento registrado pela cliente até o momento.</p>
                    ) : requestResponses.map((response) => (
                      <div className={styles.response} key={response.id}>
                        <p className={styles.meta}>Cliente · {formatDateTime(response.created_at)}</p>
                        <p className={styles.text}>{response.response_text}</p>
                      </div>
                    ))}
                  </div>
                  {resolution ? (
                    <p className={styles.meta}>
                      Resolvido manualmente em {formatDateTime(resolution.resolved_at)}.
                    </p>
                  ) : (
                    <form
                      action={resolveAnamnesisClarificationRequest.bind(
                        null,
                        submission.id,
                        request.id,
                      )}
                    >
                      <Button type="submit" variant="secondary">
                        Marcar como resolvido
                      </Button>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
