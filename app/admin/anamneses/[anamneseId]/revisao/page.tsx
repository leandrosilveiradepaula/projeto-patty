import Link from "next/link";
import { AdminAnamnesisReviewForm } from "@/components/admin/AdminAnamnesisReviewForm";
import { AdminAnamnesisWorkspaceHeader } from "@/components/admin/AdminAnamnesisWorkspaceHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisReviews,
} from "@/lib/supabase/data-access";
import { isUuid } from "@/lib/validation/uuid";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AnamnesisReviewPageProps = {
  params: Promise<{
    anamneseId: string;
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

export default async function AnamnesisReviewPage({
  params,
}: AnamnesisReviewPageProps) {
  const { anamneseId } = await params;

  if (!isUuid(anamneseId)) {
    notFound();
  }
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission) {
    notFound();
  }

  const reviews = await listAccessibleAnamnesisReviews(submission.id);
  const latestReview = reviews.at(-1) ?? null;
  const displayName = submission.clients?.full_name?.trim() || submission.clients?.profiles?.display_name?.trim();

  return (
    <>
      <AdminAnamnesisWorkspaceHeader
        activeSection="revisoes"
        clientId={submission.client_id}
        displayName={displayName}
        submissionId={submission.id}
        submittedAt={submission.submitted_at}
      />
      <p className={styles.notice}>
        Estas notas são registros profissionais append-only. Não alteram as
        respostas originais da cliente e não são exibidas para ela.
      </p>
      {submission.submitted_at ? (
        <Section
          description="A nova nota será registrada em seu perfil e preservada como histórico interno."
          id="nova-revisao"
          title="Adicionar nota interna"
        >
          <Card>
            <AdminAnamnesisReviewForm submissionId={submission.id} />
          </Card>
        </Section>
      ) : (
        <Section title="Aguardando envio final da cliente" description="O rascunho permanece preservado. A revisão profissional só começa após o envio final explícito.">
          <Link href={`/admin/clientes/${submission.client_id}/anamnese`}>Consultar status da Anamnese</Link>
        </Section>
      )}
      {submission.submitted_at ? (
        <p className={styles.notice}>
          Após registrar suas observações, continue no <Link href={`/admin/clientes/${submission.client_id}/avaliacoes`}>histórico de avaliações da cliente</Link>. A decisão profissional e a finalização da avaliação são ações separadas.
        </p>
      ) : null}
      <Section
        description="Registros anteriores em ordem cronológica, sem edição ou sobrescrita."
        title="Histórico de revisões"
      >
        {latestReview ? <p className={styles.historyNavigation}>{reviews.length} nota(s) preservada(s). <Link href={`#revisao-${latestReview.id}`}>Ir para a nota mais recente</Link></p> : null}
        {reviews.length === 0 ? (
          <EmptyState
            description="Nenhuma nota de revisão está registrada para esta submissão."
            title="Sem revisões registradas"
          />
        ) : (
          <ol className={styles.items}>
            {reviews.map((review) => {
              const reviewerName = review.profiles?.display_name?.trim();

              return (
                <li id={`revisao-${review.id}`} key={review.id}>
                  <Card className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div>
                        <p className={styles.reviewMeta}>
                          {formatDateTime(review.created_at)}
                        </p>
                        <p className={styles.reviewer}>
                          {reviewerName || "Revisor identificado pelo sistema"}
                        </p>
                      </div>
                      <Badge variant="neutral">Interno</Badge>
                    </div>
                    <p className={styles.note}>{review.note}</p>
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
