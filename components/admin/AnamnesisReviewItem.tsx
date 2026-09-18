import type { AnamnesisQuestion } from "@/lib/anamnesis/catalog";
import type { DemoReviewEntry } from "@/lib/demo/anamnesis";
import styles from "./AnamnesisReviewItem.module.css";

type AnamnesisReviewItemProps = {
  answer?: string;
  question: AnamnesisQuestion;
  reviewEntry: DemoReviewEntry;
};

export function AnamnesisReviewItem({
  answer,
  question,
  reviewEntry,
}: AnamnesisReviewItemProps) {
  return (
    <article className={styles.item}>
      <h2>{question.label}</h2>
      <section>
        <h3>Resposta da cliente</h3>
        <p>{answer ?? "Não informado"}</p>
      </section>
      <section>
        <h3>Análise da IA</h3>
        <p>
          {reviewEntry.aiAnalysis ?? "Nenhuma análise da IA disponível."}
        </p>
      </section>
      <section>
        <h3>Observação da Patty</h3>
        <p>
          {reviewEntry.pattyObservation ??
            "Nenhuma observação profissional disponível."}
        </p>
      </section>
    </article>
  );
}
