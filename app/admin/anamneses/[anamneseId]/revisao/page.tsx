import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisReviews,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AnamnesisReviewPageProps = {
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

export default async function AnamnesisReviewPage({
  params,
}: AnamnesisReviewPageProps) {
  const { anamneseId } = await params;
  const submission = await getAccessibleAnamnesisSubmission(anamneseId);

  if (!submission) {
    notFound();
  }

  const reviews = await listAccessibleAnamnesisReviews(submission.id);
  const displayName = submission.clients?.profiles?.display_name?.trim();

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
        description={
          displayName
            ? `Histórico interno de revisão da Anamnese de ${displayName}.`
            : "Histórico interno de revisão da Anamnese."
        }
        eyebrow="Uso interno"
        title="Revisões da Anamnese"
      />
      <p className={styles.notice}>
        Estas notas são registros profissionais append-only. Não alteram as
        respostas originais da cliente e não são exibidas para ela.
      </p>
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
              <li key={review.id}>
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
    </>
  );
}
