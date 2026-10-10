import { createExerciseAction } from "@/app/admin/exercicios/actions";
import { ExerciseListItem } from "@/components/admin/ExerciseListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { summarizeLibraryVersions, matchesLibraryStatus } from "@/lib/content/admin-library-status";
import { newestExerciseLibrarySummaries } from "@/lib/training/exercise-library-order";
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
  const summaries = newestExerciseLibrarySummaries(
    [...summarizeLibraryVersions(exerciseVersions, (version) => version.exercise_id).values()],
  );
  const exercises = summaries;

  const searchTerm = q?.trim() ?? "";
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const statusFilter = status === "draft" || status === "published" ? status : "all";
  const filteredExercises = exercises.filter((summary) => {
    const matchesSearch = !normalizedSearchTerm ||
      normalizeSearchValue(summary.latestVersion.name).includes(normalizedSearchTerm) ||
      (summary.latestPublishedVersion !== null && normalizeSearchValue(summary.latestPublishedVersion.name).includes(normalizedSearchTerm));
    return matchesSearch && matchesLibraryStatus(summary, statusFilter);
  });

  return (
    <>
      <PageHeader
        description="Crie e versione exercícios da biblioteca. Publicar um exercício não prescreve treino para nenhuma cliente."
        eyebrow="Admin"
        title="Exercícios"
      />

      <Section
        description="A primeira versão começa como rascunho. A Patty revisa e publica manualmente; a criação não atribui exercícios a nenhuma cliente."
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
        description="Catálogo profissional. Somente exercícios selecionados em treinos individuais e publicados pela Patty ficam visíveis às respectivas clientes."
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
            {filteredExercises.map(({ latestVersion: exerciseVersion, latestPublishedVersion }) => {
              const publishedMeta = exerciseVersion.published_at
                ? "Publicado em " + formatPublishedDate(exerciseVersion.published_at) + "."
                : latestPublishedVersion
                  ? `Versão atual em rascunho. Versão ${latestPublishedVersion.version_number} permanece publicada.`
                  : "Versão atual em rascunho; nenhuma versão publicada.";

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
                          exerciseVersion.published_at ? "neutral" : "warning"
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
