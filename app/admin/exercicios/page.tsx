import { ExerciseListItem } from "@/components/admin/ExerciseListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import styles from "./page.module.css";

const demoExercises = [
  {
    category: "Categoria a definir",
    mediaType: "Vídeo",
    meta: "Registro técnico de demonstração para validar a estrutura da biblioteca.",
    name: "Exercício Demonstração 001",
  },
  {
    category: "Categoria a definir",
    mediaType: "Vídeo",
    meta: "Item sintético sem regra operacional associada.",
    name: "Exercício Demonstração 002",
  },
  {
    category: "Categoria a definir",
    mediaType: "Vídeo",
    meta: "Registro com nome longo para validar quebra de texto em telas estreitas.",
    name: "Exercício Demonstração 003 com nome longo para validação responsiva",
  },
];

export default function AdminExerciciosPage() {
  return (
    <>
      <PageHeader
        description="Estrutura inicial da biblioteca técnica de exercícios, separada da área de conteúdos."
        eyebrow="Admin"
        title="Exercícios"
      />
      <p className={styles.demoNote}>
        Dados sintéticos para validação da interface.
      </p>
      <Section
        description="Itens de demonstração para validar nome, categoria, mídia e estado neutro."
        title="Biblioteca de exercícios"
      >
        <ul className={styles.exerciseList}>
          {demoExercises.map((exercise) => (
            <li key={exercise.name}>
              <ExerciseListItem
                category={exercise.category}
                mediaType={exercise.mediaType}
                meta={exercise.meta}
                name={exercise.name}
                status={<Badge variant="neutral">Demo</Badge>}
              />
            </li>
          ))}
        </ul>
      </Section>
      <Section
        description="Estados estruturais disponíveis para uso futuro, sem fluxo operacional nesta etapa."
        title="Estado futuro"
      >
        <div className={styles.supportGrid}>
          <Card variant="subtle">
            <EmptyState
              description="A integração com dados reais, arquivos e permissões será definida em tarefas próprias."
              title="Sem backend integrado"
            />
          </Card>
          <Card variant="subtle">
            <EmptyState
              description="A composição de acompanhamentos fica fora desta biblioteca estrutural."
              title="Uso operacional separado"
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
