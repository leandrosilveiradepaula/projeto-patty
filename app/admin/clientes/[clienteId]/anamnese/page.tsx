import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { summarizeAnamnesisReviewHistory } from "@/lib/anamnesis/review-summary";
import { loadClientClarificationSummary } from "@/lib/follow-up/client-clarification-summary-loader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleAnamnesisSubmissions,
  listAccessibleAnamnesisReviewsForSubmissions,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteAnamnesePageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClienteAnamnesePage({
  params,
}: AdminClienteAnamnesePageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const submissions = await listAccessibleAnamnesisSubmissions(client.id);
  const pendingSubmissions = submissions.filter(
    (submission) => !submission.submitted_at,
  );
  const submittedSubmissions = submissions.filter(
    (submission) => Boolean(submission.submitted_at),
  );
  const submittedIds = submittedSubmissions.map((submission) => submission.id);
  const [reviews, clarificationSummary] = await Promise.all([
    listAccessibleAnamnesisReviewsForSubmissions(submittedIds),
    loadClientClarificationSummary(submittedIds),
  ]);
  const reviewSummaries = summarizeAnamnesisReviewHistory(reviews);
  const reviewedSubmissionIds = new Set(reviewSummaries.keys());
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Respostas e versões preservadas no histórico"
        displayName={displayName}
        secondary="Histórico real de Anamnese"
        status={<Badge variant="neutral">{submissions.length} registro(s)</Badge>}
      />
      <ClientWorkspaceNav activeArea="anamnese" clientId={client.id} />
      {pendingSubmissions.length > 0 ? (
        <Section
          action={<Badge variant="warning">{pendingSubmissions.length} pendente(s)</Badge>}
          description="Rascunhos iniciados pela cliente, ainda não enviados. Eles não equivalem a Anamnese concluída nem geram revisão profissional nesta lista."
          title="Aguardando cliente"
        >
          <ol className={styles.submissionList}>
            {pendingSubmissions.map((submission) => {
              const version = submission.anamnesis_form_versions;

              return (
                <li key={submission.id}>
                  <Card className={styles.submissionCard}>
                    <div className={styles.submissionHeader}>
                      <div>
                        <h2 className={styles.submissionTitle}>
                          {version?.version_number
                            ? `Anamnese · versão ${version.version_number}`
                            : "Anamnese"}
                        </h2>
                        <p className={styles.submissionMeta}>
                          Criada em {formatDateTime(submission.created_at)}
                        </p>
                      </div>
                      <Badge variant="warning">Aguardando cliente</Badge>
                    </div>
                    <p className={styles.submissionMeta}>
                      As respostas ainda não foram enviadas. Rascunhos da cliente não integram o histórico concluído.
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}
      <Section
        description="Somente Anamneses efetivamente enviadas aparecem aqui. As respostas originais e a versão utilizada permanecem preservadas para consulta."
        title="Histórico enviado"
      >
        {submittedSubmissions.length === 0 ? (
          <EmptyState
            description={
              pendingSubmissions.length > 0
                ? "Quando a cliente enviar a Anamnese pendente, ela aparecerá neste histórico."
                 : "Não há Anamnese enviada nem rascunho registrado para esta cliente."
            }
            title="Sem Anamnese enviada"
          />
        ) : (
          <ol className={styles.submissionList}>
            {submittedSubmissions.map((submission) => {
              const version = submission.anamnesis_form_versions;
              const clarification = clarificationSummary.bySubmission.get(submission.id);
              const awaitingClient = clarification?.awaitingClient ?? 0;
              const awaitingProfessional = clarification?.awaitingProfessional ?? 0;
              const hasProfessionalNote = reviewedSubmissionIds.has(submission.id);
              const reviewSummary = reviewSummaries.get(submission.id);

              return (
                <li key={submission.id}>
                  <Card className={styles.submissionCard}>
                    <div className={styles.submissionHeader}>
                      <div>
                        <h2 className={styles.submissionTitle}>
                          {version?.version_number
                            ? `Anamnese · versão ${version.version_number}`
                            : "Anamnese"}
                        </h2>
                        <p className={styles.submissionMeta}>
                          Enviada em {formatDateTime(submission.submitted_at!)}
                        </p>
                      </div>
                      <Badge variant="neutral">Enviada</Badge>
                    </div>
                    <dl className={styles.submissionDetails}>
                      <div>
                        <dt>Criação</dt>
                        <dd>{formatDateTime(submission.created_at)}</dd>
                      </div>
                      <div>
                        <dt>Nota de revisão profissional</dt>
                        <dd>{hasProfessionalNote ? `Registro interno encontrado · ${reviewSummary?.count} nota(s)` : "Ainda não registrada"}</dd>
                      </div>
                      <div>
                        <dt>Esclarecimentos aguardando cliente</dt>
                        <dd>{awaitingClient}</dd>
                      </div>
                      <div>
                        <dt>Complementos aguardando Patty</dt>
                        <dd>{awaitingProfessional}</dd>
                      </div>
                    </dl>
                    {reviewSummary ? (
                      <Link
                        className={styles.detailLink}
                        href={`/admin/anamneses/${submission.id}/revisao#revisao-${reviewSummary.latest.id}`}
                      >
                        Consultar última nota interna · {formatDateTime(reviewSummary.latest.created_at)}
                      </Link>
                    ) : null}
                    {!hasProfessionalNote ? (
                      <p className={styles.submissionMeta}>
                        Esta submissão ainda não possui nota de revisão profissional registrada.
                      </p>
                    ) : null}
                    {awaitingClient > 0 && awaitingProfessional > 0 ? (
                      <p className={styles.submissionMeta}>
                        Existem esclarecimentos em duas situações distintas: alguns já foram respondidos e aguardam revisão da Patty; outros ainda aguardam a cliente.
                      </p>
                    ) : null}
                    {awaitingProfessional > 0 && clarification?.firstAwaitingProfessionalRequestId ? (
                      <Link
                        className={styles.detailLink}
                        href={`/admin/anamneses/${submission.id}/esclarecimentos#esclarecimento-${clarification.firstAwaitingProfessionalRequestId}`}
                      >
                        Revisar {awaitingProfessional} complemento(s) da cliente
                      </Link>
                    ) : null}
                    {awaitingClient > 0 && clarification?.firstAwaitingClientRequestId ? (
                      <Link
                        className={styles.detailLink}
                        href={`/admin/anamneses/${submission.id}/esclarecimentos#esclarecimento-${clarification.firstAwaitingClientRequestId}`}
                      >
                        Ver {awaitingClient} pedido(s) aguardando resposta da cliente
                      </Link>
                    ) : null}
                    <Link
                      className={styles.detailLink}
                      href={`/admin/anamneses/${submission.id}`}
                    >
                      Ver respostas originais
                    </Link>
                    <Link className={styles.detailLink} href={`/admin/anamneses/${submission.id}/revisao`}>
                      Abrir revisão profissional
                    </Link>
                    <Link className={styles.detailLink} href={`/admin/anamneses/${submission.id}/esclarecimentos`}>
                      Consultar esclarecimentos
                    </Link>
                    <Link className={styles.detailLink} href={`/admin/anamneses/${submission.id}/correcoes`}>
                      Consultar correções
                    </Link>
                    <Link className={styles.detailLink} href={`/admin/anamneses/${submission.id}/ia`}>
                      Consultar análise assistiva
                    </Link>
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
