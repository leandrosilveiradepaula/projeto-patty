import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listPublishedExerciseVersionsForCurrentClient } from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ClientExercisesPage() {
  const exercises = await listPublishedExerciseVersionsForCurrentClient();

  return (
    <>
      <PageHeader
        description="Consulte os exercícios publicados na biblioteca da Consultoria Corpo & Mente."
        eyebrow="Cliente"
        title="Biblioteca de exercícios"
      />

      <Section
        description="A biblioteca é material de consulta. Ela não representa, sozinha, um treino prescrito para você."
        title="Exercícios publicados"
      >
        {exercises.length === 0 ? (
          <EmptyState
            description="Ainda não há exercícios publicados na biblioteca."
            title="Biblioteca vazia"
          />
        ) : (
          <ul className={styles.list}>
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <Card className={styles.card} variant="subtle">
                  <div className={styles.header}>
                    <h2 className={styles.title}>{exercise.name}</h2>
                    <Badge variant="neutral">
                      Versão {exercise.version_number}
                    </Badge>
                  </div>
                  <p className={styles.meta}>
                    Publicado em {formatDate(exercise.published_at!)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
