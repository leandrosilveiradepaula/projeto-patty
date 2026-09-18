import type { AnamnesisCategory } from "@/lib/anamnesis/catalog";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ClientAnamnesisQuestion } from "./ClientAnamnesisQuestion";
import styles from "./ClientAnamnesisSection.module.css";

type ClientAnamnesisSectionProps = {
  category: AnamnesisCategory;
};

function getEmptyCategoryMessage(categoryId: string) {
  if (categoryId === "historico-de-vida") {
    return "Nenhuma pergunta documentada está disponível para esta seção nesta etapa.";
  }

  return "A estrutura desta categoria será definida em etapa posterior.";
}

export function ClientAnamnesisSection({
  category,
}: ClientAnamnesisSectionProps) {
  return (
    <section className={styles.section} id={category.id}>
      <h2>{category.label}</h2>
      <p className={styles.description}>{category.description}</p>
      {category.id === "cadastro" ? (
        <Card>
          <Link className={styles.profileLink} href="/cliente/perfil">
            Ver cadastro atual
          </Link>
        </Card>
      ) : category.questions.length > 0 ? (
        <div className={styles.questions}>
          {category.questions.map((question) => (
            <ClientAnamnesisQuestion key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <Card>
          <p className={styles.emptyMessage}>
            {getEmptyCategoryMessage(category.id)}
          </p>
        </Card>
      )}
    </section>
  );
}
