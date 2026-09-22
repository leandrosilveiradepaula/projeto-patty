import { ExerciseListItem } from "@/components/admin/ExerciseListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listExerciseVersionsVisibleToCurrentAdmin } from "@/lib/supabase/data-access";
import styles from "./page.module.css";

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminExerciciosPage() {
  const exerciseVersions = await listExerciseVersionsVisibleToCurrentAdmin();

  return (
    <>
      <PageHeader
        description="Biblioteca técnica de exercícios acessível ao seu perfil administrativo."
        eyebrow="Admin"
        title="Exercícios"
      />
      <Section
        description="Versões registradas em ordem da criação mais recente para a mais antiga."
        title="Biblioteca de exercícios"
      >
        {exerciseVersions.length === 0 ? (
          <EmptyState
            description="As versões de exercícios visíveis ao seu perfil aparecerão nesta área."
            title="Nenhum exercício disponível"
          />
        ) : (
          <ul className={styles.exerciseList}>
            {exerciseVersions.map((exerciseVersion) => {
              const publishedMeta = exerciseVersion.published_at
                ? `Publicado em ${formatPublishedDate(exerciseVersion.published_at)}.`
                : "Não publicado.";

              return (
                <li key={exerciseVersion.id}>
                  <ExerciseListItem
                    meta={`Versão ${exerciseVersion.version_number}. ${publishedMeta}`}
                    name={exerciseVersion.name}
                    status={
                      <Badge variant="neutral">
                        {exerciseVersion.published_at ? "Publicado" : "Não publicado"}
                      </Badge>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
