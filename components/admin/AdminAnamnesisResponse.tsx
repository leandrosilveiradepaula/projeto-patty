import type { AnamnesisQuestion } from "@/lib/anamnesis/catalog";
import { Card } from "@/components/ui/Card";
import styles from "./AdminAnamnesisResponse.module.css";

type AdminAnamnesisResponseProps = {
  answer?: string;
  question: AnamnesisQuestion;
};

export function AdminAnamnesisResponse({
  answer,
  question,
}: AdminAnamnesisResponseProps) {
  return (
    <Card className={styles.response}>
      <h3>{question.label}</h3>
      <dl>
        <div>
          <dt>Resposta da cliente</dt>
          <dd>{answer ?? "Não informado"}</dd>
        </div>
      </dl>
    </Card>
  );
}
