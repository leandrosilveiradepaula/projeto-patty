import { createExerciseAction } from "@/app/admin/exercicios/actions";
import { ExerciseListItem } from "@/components/admin/ExerciseListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { listExerciseVersionsVisibleToCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";


function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

type AdminExerciciosPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminExerciciosPage({ searchParams }: AdminExerciciosPageProps) {
  const { q, status } = await searchParams;
  const exerciseVersions = await listExerciseVersionsVisibleToCurrentAdmin();
  const latestByExercise = new Map<string, (typeof exerciseVersions)[number]>();

  for (const version of exerciseVersions) {
    const current = latestByExercise.get(version.exercise_id);

    if (!current || version.version_number > current.version_number) {
      latestByExercise.set(version.exercise_id, version);
    }
  }

  const exercises = [...latestByExercise.values()].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );

  const searchTerm = q?.trim() ?? "";
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const statusFilter = status === "draft" || status === "published" ? status : "all";
  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      normalizeSearchValue(exercise.name).includes(normalizedSearchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" ? Boolean(exercise.published_at) : !exercise.published_at);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHeader
        description="Crie e versione exercícios da biblioteca. Publicar um exercício não prescreve treino para nenhuma cliente."
        eyebrow="Admin"
        title="Exercícios"
      />

      <Section
        description="A primeira versão começa como rascunho. A Patty revisa e publica manualmente."
        title="Novo exercício"
      >
        <Card className={styles.createCard}>
          <form action={createExerciseAction} className={styles.createForm}>
            <label className={styles.field}>
              <span>Nome do exercício</span>
              <input
                maxLength={200}
                name="exerciseName"
                placeholder="Ex.: Agachamento"
                required
              />
            </label>
            <Button type="submit">Criar rascunho</Button>
          </form>
        </Card>
      </Section>

      <Section
        description="Cada item abre o histórico versionado do exercício."
        title="Biblioteca de exercícios"
      >
        {exercises.length > 0 ? (
          <form action="/admin/exercicios" className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Buscar exercício</span>
              <TextInput
                defaultValue={searchTerm}
                name="q"
                placeholder="Digite o nome do exercício"
                type="search"
              />
            </label>
            <label className={styles.statusField}>
              <span>Status</span>
              <select defaultValue={statusFilter} name="status">
                <option value="all">Todos</option>
                <option value="draft">Rascunhos</option>
                <option value="published">Publicados</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {searchTerm || statusFilter !== "all" ? (
              <Link className={styles.clearLink} href="/admin/exercicios">Limpar</Link>
            ) : null}
          </form>
        ) : null}
        {exercises.length === 0 ? (
          <EmptyState
            description="Crie o primeiro exercício para iniciar a biblioteca."
            title="A biblioteca de exercícios está vazia"
          />
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            description="Ajuste a busca ou limpe os filtros para voltar a ver a biblioteca completa."
            title="Nenhum exercício encontrado"
          />
        ) : (
          <>
            <p className={styles.resultCount}>
              {filteredExercises.length} de {exercises.length} exercício(s)
            </p>
            <ul className={styles.exerciseList}>
            {filteredExercises.map((exerciseVersion) => {
              const publishedMeta = exerciseVersion.published_at
                ? "Publicado em " +
                  formatPublishedDate(exerciseVersion.published_at) +
                  "."
                : "Versão atual em rascunho.";

              return (
                <li key={exerciseVersion.exercise_id}>
                  <ExerciseListItem
                    action={
                      <Link
                        aria-label={`Abrir exercício ${exerciseVersion.name}`}
                        className={styles.openLink}
                        href={"/admin/exercicios/" + exerciseVersion.exercise_id}
                      >
                        Abrir
                      </Link>
                    }
                    meta={
                      "Versão " +
                      exerciseVersion.version_number +
                      ". " +
                      publishedMeta
                    }
                    name={exerciseVersion.name}
                    status={
                      <Badge
                        variant={
                          exerciseVersion.published_at ? "positive" : "warning"
                        }
                      >
                        {exerciseVersion.published_at ? "Publicado" : "Rascunho"}
                      </Badge>
                    }
                  />
                </li>
              );
            })}
          </ul>
          </>
        )}
      </Section>
    </>
  );
}
