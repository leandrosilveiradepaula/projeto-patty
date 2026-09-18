import { AnamnesisReviewItem } from "@/components/admin/AnamnesisReviewItem";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAnamnesisQuestion } from "@/lib/anamnesis/catalog";
import {
  getDemoAnamnesis,
  getDemoClient,
} from "@/lib/demo/anamnesis";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AnamnesisReviewPageProps = {
  params: Promise<{
    anamneseId: string;
  }>;
};

export default async function AnamnesisReviewPage({
  params,
}: AnamnesisReviewPageProps) {
  const { anamneseId } = await params;
  const anamnesis = getDemoAnamnesis(anamneseId);

  if (!anamnesis) {
    notFound();
  }

  const client = getDemoClient(anamnesis.clientId);

  if (!client) {
    notFound();
  }

  return (
    <>
      <PageHeader
        actions={
          <Link
            className={styles.backLink}
            href={`/admin/clientes/${client.id}/anamnese`}
          >
            Voltar à anamnese
          </Link>
        }
        description={`Revisão administrativa demonstrativa da Anamnese de ${client.label}.`}
        eyebrow="Uso interno"
        title="Revisão da Anamnese"
      />
      <p className={styles.notice}>
        Análise da IA e observações da Patty não são visíveis para a cliente.
      </p>
      {anamnesis.reviewEntries.length > 0 ? (
        <div className={styles.items}>
          {anamnesis.reviewEntries.map((reviewEntry) => {
            const question = getAnamnesisQuestion(reviewEntry.questionId);

            return question ? (
              <AnamnesisReviewItem
                answer={anamnesis.answers[reviewEntry.questionId]}
                key={reviewEntry.questionId}
                question={question}
                reviewEntry={reviewEntry}
              />
            ) : null;
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>
          Nenhuma revisão demonstrativa disponível para esta Anamnese.
        </p>
      )}
    </>
  );
}
