import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import styles from "./page.module.css";

const demoContents = [
  {
    category: "Metodologia",
    meta: "Estrutura reservada para materiais educacionais validados futuramente.",
    title: "Conteúdo Demonstração 001",
    type: "Material educativo",
  },
  {
    category: "Receitas",
    meta: "Item sintético sem regra de liberação ou classificação operacional.",
    title: "Conteúdo Demonstração 002",
    type: "Referência textual",
  },
  {
    category: "Orientações",
    meta: "Registro de demonstração para validar leitura e quebra de texto.",
    title:
      "Conteúdo Demonstração 003 com título longo para validação responsiva",
    type: "Orientação",
  },
];

export default function AdminConteudosPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da biblioteca educacional, separada da biblioteca de exercícios."
        eyebrow="Admin"
        title="Conteúdos"
      />
      <p className={styles.demoNote}>
        Dados sintéticos para validação da interface.
      </p>
      <Section
        description="Itens de demonstração para validar título, categoria, tipo e estado editorial sem regras de liberação."
        title="Biblioteca educacional"
      >
        <ul className={styles.contentList}>
          {demoContents.map((content) => (
            <li key={content.title}>
              <ContentListItem
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
        description="Estados estruturais disponíveis para uso futuro, sem fluxo de criação, upload ou publicação nesta etapa."
        title="Estado futuro"
      >
        <div className={styles.supportGrid}>
          <Card variant="subtle">
            <EmptyState
              description="A integração com dados reais, permissões e publicação será definida em tarefas próprias."
              title="Sem backend integrado"
            />
          </Card>
          <Card variant="subtle">
            <EmptyState
              description="A biblioteca de exercícios permanece separada e não é representada nesta tela."
              title="Exercícios fora desta biblioteca"
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
