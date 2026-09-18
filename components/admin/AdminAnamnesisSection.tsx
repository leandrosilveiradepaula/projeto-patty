import type {
  AnamnesisCategory,
  AnamnesisQuestionId,
} from "@/lib/anamnesis/catalog";
import type { DemoAnswer } from "@/lib/demo/anamnesis";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AdminAnamnesisResponse } from "./AdminAnamnesisResponse";
import styles from "./AdminAnamnesisSection.module.css";

type AdminAnamnesisSectionProps = {
  answers: DemoAnswer;
  category: AnamnesisCategory;
  clientId: string;
};

export function AdminAnamnesisSection({
  answers,
  category,
  clientId,
}: AdminAnamnesisSectionProps) {
  return (
    <section className={styles.section} id={category.id}>
      <h2>{category.label}</h2>
      <p className={styles.description}>{category.description}</p>
      {category.id === "cadastro" ? (
        <Card>
          <Link className={styles.registrationLink} href={`/admin/clientes/${clientId}`}>
            Ver cadastro atual
          </Link>
        </Card>
      ) : category.questions.length > 0 ? (
        <div className={styles.responses}>
          {category.questions.map((question) => (
            <AdminAnamnesisResponse
              answer={answers[question.id as AnamnesisQuestionId]}
              key={question.id}
              question={question}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className={styles.emptyMessage}>
            Nenhuma resposta demonstrativa disponível nesta categoria.
          </p>
        </Card>
      )}
    </section>
  );
}
