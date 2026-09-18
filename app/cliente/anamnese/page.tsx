import { ClientAnamnesisNavigation } from "@/components/client/ClientAnamnesisNavigation";
import { ClientAnamnesisSection } from "@/components/client/ClientAnamnesisSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { anamnesisCategories } from "@/lib/anamnesis/catalog";
import styles from "./page.module.css";

export default function ClienteAnamnesePage() {
  return (
    <>
      <PageHeader
        description="Estrutura demonstrativa de perguntas documentadas no formulário atual. Esta interface ainda não registra respostas."
        eyebrow="Cliente"
        title="Anamnese"
      />
      <div className={styles.layout}>
        <ClientAnamnesisNavigation categories={anamnesisCategories} />
        <div className={styles.sections}>
          {anamnesisCategories.map((category) => (
            <ClientAnamnesisSection category={category} key={category.id} />
          ))}
        </div>
      </div>
    </>
  );
}
