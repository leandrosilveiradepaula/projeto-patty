import { clarificationFollowupStatus, clarificationStatusLabel, clarificationStatusVariant } from "@/lib/follow-up/clarification-status";
import { ClientAnamnesisClarificationResponseForm } from "@/components/client/ClientAnamnesisClarificationResponseForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  getCurrentClient,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisClarificationRequests,
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisClarificationResolutions,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { isUuid } from "@/lib/validation/uuid";
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

export default async function ClientAnamnesisClarificationsPage({ params }: PageProps) {
  const { anamneseId } = await params;

  if (!isUuid(anamneseId)) {
    notFound();
  }

  const [client, submission] = await Promise.all([
    getCurrentClient(),
    getAccessibleAnamnesisSubmission(anamneseId),
  ]);
  if (!client || !submission || submission.client_id !== client.id || !submission.submitted_at) notFound();

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
  const resolvedRequestIds = new Set(
    resolutions.map((resolution) => resolution.clarification_request_id),
  );
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const responsesByRequestId = new Map<string, typeof responses>();

  for (const response of responses) {
    const entries = responsesByRequestId.get(response.clarification_request_id) ?? [];
    entries.push(response);
    responsesByRequestId.set(response.clarification_request_id, entries);
  }

  const firstAwaitingClientId = requests.find((r) => !resolvedRequestIds.has(r.id) && !(responsesByRequestId.get(r.id)?.length))?.id;
  return (
    <>
      <PageHeader
        actions={<Link className={styles.backLink} href={`/cliente/anamnese/${submission.id}`}>Voltar à Anamnese</Link>}
        description="Aqui você pode complementar informações solicitadas pela Patty sem alterar suas respostas originais."
        eyebrow="Cliente"
        title="Esclarecimentos"
      />
      <Section description="Os complementos ficam registrados separadamente da Anamnese original." title="Pedidos da Patty">
        {requests.length === 0 ? (
          <EmptyState description="Não há pedidos de esclarecimento para esta Anamnese." title="Nenhum esclarecimento solicitado" />
        ) : (
          <>
            {firstAwaitingClientId ? <p className={styles.jump}><Link href={`#esclarecimento-${firstAwaitingClientId}`}>Ir para o primeiro pedido aguardando sua resposta</Link></p> : null}
          <div className={styles.list}>
            {requests.map((request) => {
              const sourceAnswer = request.source_answer_id ? answersById.get(request.source_answer_id) : undefined;
              const sourceQuestion = sourceAnswer ? questionsById.get(sourceAnswer.question_id) : undefined;
              const requestResponses = responsesByRequestId.get(request.id) ?? [];
              const resolved = resolvedRequestIds.has(request.id);
              const status = clarificationFollowupStatus({ hasResponse: requestResponses.length > 0, resolved });
              return (
                <div id={`esclarecimento-${request.id}`} key={request.id}>
                <Card className={styles.entry}>
                  <div className={styles.entryHeader}>
                    <h2 className={styles.entryTitle}>Pedido da Patty</h2>
                    <div className={styles.statusGroup}>
                      <Badge variant={clarificationStatusVariant(status)}>{clarificationStatusLabel(status, "client")}</Badge>
                      <Badge variant="neutral">{formatDateTime(request.created_at)}</Badge>
                    </div>
                  </div>
                  <p className={styles.text}>{request.request_text}</p>
                  {sourceAnswer ? (
                    <div className={styles.original}>
                      <p className={styles.originalLabel}>Sua resposta original relacionada</p>
                      <p className={styles.meta}>{sourceQuestion?.label ?? "Pergunta da Anamnese"}</p>
                      <p className={styles.text}>{formatAnswer(sourceAnswer.answer_value)}</p>
                    </div>
                  ) : null}
                  <div className={styles.responses}>
                    {requestResponses.map((response) => (
                      <div className={styles.response} key={response.id}>
                        <p className={styles.meta}>Seu complemento · {formatDateTime(response.created_at)}</p>
                        <p className={styles.text}>{response.response_text}</p>
                      </div>
                    ))}
                  </div>
                  {resolved ? (
                    <p className={styles.meta}>
                      Este pedido já foi marcado como resolvido pela Patty e não aceita novos complementos.
                    </p>
                  ) : (
                    <>
                      {status === "awaiting_professional" ? <p className={styles.meta}>Seu complemento já foi registrado. A Patty ainda precisa revisar; você pode acrescentar informações enquanto este pedido estiver aberto.</p> : null}
                      <ClientAnamnesisClarificationResponseForm requestId={request.id} submissionId={submission.id} />
                    </>
                  )}
                </Card>
                </div>
              );
            })}
          </div>
          </>
        )}
      </Section>
    </>
  );
}
