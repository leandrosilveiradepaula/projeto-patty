import { ClientContentCard } from "@/components/client/ClientContentCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import styles from "./page.module.css";

const demoContents = [
  {
    category: "Metodologia",
    meta: "Item sintético para validar a apresentação de materiais educacionais.",
    title: "Conteúdo Demonstração 001",
    type: "Vídeo",
  },
  {
    category: "Alimentação",
    meta: "Registro de demonstração sem regra operacional associada.",
    title: "Conteúdo Demonstração 002",
    type: "PDF",
  },
  {
    category: "Receitas",
    meta: "Item neutro para validar leitura e quebra de texto em telas estreitas.",
    title:
      "Conteúdo Demonstração 003 com título longo para validação responsiva",
    type: "Imagem",
  },
];

export default function ClienteConteudosPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da biblioteca educacional."
        eyebrow="Cliente"
        title="Conteúdos"
      />
      <p className={styles.demoNote}>
        Dados sintéticos para validação da interface.
      </p>
      <Section
        description="Itens de demonstração para validar título, categoria e tipo de conteúdo."
        title="Biblioteca educacional"
      >
        <ul className={styles.contentList}>
          {demoContents.map((content) => (
            <li key={content.title}>
              <ClientContentCard
                category={content.category}
                meta={content.meta}
                status={<Badge variant="neutral">Demo</Badge>}
                title={content.title}
                type={content.type}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section
        description="Espaço reservado para integração futura com materiais reais."
        title="Estado futuro"
      >
        <div className={styles.supportGrid}>
          <Card variant="subtle">
            <EmptyState
              description="A integração com materiais reais será definida em tarefa própria."
              title="Sem dados integrados"
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
