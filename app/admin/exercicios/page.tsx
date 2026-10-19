import { readExerciseDirectoryPage, paginateExerciseDirectory, exerciseDirectoryPageHref, exerciseCatalogBackHref, readExerciseCatalogSort, sortExerciseCatalog } from "@/lib/training/exercise-admin-directory";
import { AdminExerciseCreateForm } from "@/components/admin/AdminExerciseCreateForm";
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
import { matchingExerciseNameVersion, readExerciseCatalogStatus, readExerciseCatalogTerm } from "@/lib/training/exercise-admin-directory";
import { listExerciseVersionsVisibleToCurrentAdmin, listExercisesForCurrentAdmin } from "@/lib/supabase/data-access";
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
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

type AdminExerciciosPageProps = {
  searchParams: Promise<{ q?: string; status?: string; ordem?: string; pagina?: string }>;
};

export default async function AdminExerciciosPage({ searchParams }: AdminExerciciosPageProps) {
  const { q, status, ordem, pagina } = await searchParams;
  const [exerciseVersions, exerciseParents] = await Promise.all([
    listExerciseVersionsVisibleToCurrentAdmin(),
    listExercisesForCurrentAdmin(),
  ]);
  const summaries = newestExerciseLibrarySummaries(
    [...summarizeLibraryVersions(exerciseVersions, (version) => version.exercise_id).values()],
  );
  const exercises = summaries;

  const searchTerm = readExerciseCatalogTerm(q);
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const statusFilter = readExerciseCatalogStatus(status);
  const sort = readExerciseCatalogSort(ordem);
  const versionsByExercise = new Map<string, typeof exerciseVersions>();
  for (const version of exerciseVersions) {
    const current = versionsByExercise.get(version.exercise_id) ?? [];
    current.push(version);
    versionsByExercise.set(version.exercise_id, current);
  }
  const incompleteParents = exerciseParents.filter((parent) => !versionsByExercise.has(parent.id));
  const filteredIncomplete = statusFilter === "all" || statusFilter === "incomplete"
    ? incompleteParents.filter(() => !normalizedSearchTerm)
    : [];
  const filteredExercises = exercises.filter((summary) => {
    const matchesSearch = !normalizedSearchTerm ||
      normalizeSearchValue(summary.latestVersion.name).includes(normalizedSearchTerm) ||
      (summary.latestPublishedVersion !== null && normalizeSearchValue(summary.latestPublishedVersion.name).includes(normalizedSearchTerm)) ||
      Boolean(matchingExerciseNameVersion(versionsByExercise.get(summary.latestVersion.exercise_id) ?? [], searchTerm));
    return matchesSearch && statusFilter !== "incomplete" && matchesLibraryStatus(summary, statusFilter);
  });

  const pageRequest = readExerciseDirectoryPage(pagina);
  // The default keeps the existing order. Alternate orders use facts from
  // the full RLS-authorized version history before pagination.
  const orderedExercises = sort === "recent"
    ? filteredExercises
    : sortExerciseCatalog(
        filteredExercises.map((summary) => ({
          ...summary,
          versionCount: versionsByExercise.get(summary.latestVersion.exercise_id)?.length ?? 0,
        })),
        sort,
      );
  const orderedCatalog = [
    ...orderedExercises.map(summary => ({ type: "versioned" as const, summary })),
    ...filteredIncomplete.map(parent => ({ type: "incomplete" as const, parent })),
  ];
  const directory = paginateExerciseDirectory(orderedCatalog, pageRequest.page);
  const shownExercises = directory.items.filter((item): item is Extract<typeof directory.items[number], { type: "versioned" }> => item.type === "versioned").map(item => item.summary);
  const shownIncomplete = directory.items.filter((item): item is Extract<typeof directory.items[number], { type: "incomplete" }> => item.type === "incomplete").map(item => item.parent);

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
          <AdminExerciseCreateForm />
        </Card>
      </Section>

      <Section
        description="Catálogo profissional. Somente exercícios selecionados em treinos individuais e publicados pela Patty ficam visíveis às respectivas clientes."
        id="biblioteca-exercicios"
        title="Biblioteca de exercícios"
      >
        {exercises.length > 0 ? (
          <form action="/admin/exercicios" className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Buscar exercício</span>
              <TextInput
                defaultValue={searchTerm}
                name="q"
                maxLength={120}
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
                <option value="incomplete">Sem versão inicial</option>
              </select>
            </label>
            <label className={styles.statusField}>
              <span>Ordenar</span>
              <select defaultValue={sort} name="ordem">
                <option value="recent">Ordem atual</option>
                <option value="oldest">Mais antigos</option>
                <option value="name-asc">Nome A–Z</option>
                <option value="name-desc">Nome Z–A</option>
                <option value="published">Publicação mais recente</option>
                <option value="versions">Mais versões registradas</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {searchTerm || statusFilter !== "all" || sort !== "recent" ? (
              <Link className={styles.clearLink} href="/admin/exercicios">Limpar</Link>
            ) : null}
          </form>
        ) : null}
        <p className={styles.resultCount} role="status">
          {filteredExercises.length + filteredIncomplete.length} resultado(s) · {incompleteParents.length} cadastro(s) sem versão inicial.
        </p>
        {pageRequest.invalid || pageRequest.page > directory.pageCount ? (
          <p className={styles.resultCount} role="status">Página indisponível. Exibindo uma página válida da biblioteca.</p>
        ) : null}
        {exercises.length === 0 && incompleteParents.length === 0 ? (
          <EmptyState
            description="Crie o primeiro exercício para iniciar a biblioteca."
            title="A biblioteca de exercícios está vazia"
          />
        ) : filteredExercises.length === 0 && filteredIncomplete.length === 0 ? (
          <EmptyState
            description="Ajuste a busca ou limpe os filtros para voltar a ver a biblioteca completa."
            title="Nenhum exercício encontrado"
            action={<Link className={styles.clearLink} href="/admin/exercicios">Limpar busca e filtros</Link>}
          />
        ) : (
          <>
            <p className={styles.resultCount}>
              {filteredExercises.length} exercício(s) com versão encontrados.
            </p>
            <ul className={styles.exerciseList}>
            {shownExercises.map(({ latestVersion: exerciseVersion, latestPublishedVersion }) => {
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
                        href={"/admin/exercicios/" + exerciseVersion.exercise_id +
                          exerciseCatalogBackHref(searchTerm, statusFilter, sort, directory.page)
                            .slice("/admin/exercicios".length)}
                      >
                        Abrir
                      </Link>
                    }
                    meta={
                      "Versão " +
                      exerciseVersion.version_number +
                      ". " +
                      publishedMeta +
                      (searchTerm && matchingExerciseNameVersion(versionsByExercise.get(exerciseVersion.exercise_id) ?? [], searchTerm)?.id !== exerciseVersion.id
                        ? " Correspondência encontrada também no histórico."
                        : "")
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
          {shownIncomplete.length > 0 ? (
            <ul className={styles.exerciseList} aria-label="Cadastros sem versão inicial">
              {shownIncomplete.map((parent) => (
                <li key={parent.id} className={styles.incompleteRow}>
                  <div>
                    <strong>Exercício sem versão inicial</strong>
                    <p>O cadastro existe, mas nenhuma versão foi registrada. Recupere o rascunho sem publicar.</p>
                  </div>
                  <Link className={styles.openLink} href={`/admin/exercicios/${parent.id}${exerciseCatalogBackHref("", "incomplete", sort, directory.page).slice("/admin/exercicios".length)}`}>
                    Retomar versão inicial
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          </>
        )}
        {directory.total > 0 ? (
          <nav className={styles.directoryPages} aria-label="Páginas da biblioteca de exercícios">
            <span>Exibindo {directory.first}–{directory.last} de {directory.total} · Página {directory.page} de {directory.pageCount}</span>
            {directory.page > 1 ? <Link href={exerciseDirectoryPageHref(searchTerm, statusFilter, directory.page - 1, sort)}>Anterior</Link> : null}
            {directory.page < directory.pageCount ? <Link href={exerciseDirectoryPageHref(searchTerm, statusFilter, directory.page + 1, sort)}>Próxima</Link> : null}
          </nav>
        ) : null}
      </Section>
    </>
  );
}
