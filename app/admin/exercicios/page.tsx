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
import { matchingExerciseNameVersion, readExerciseCatalogStatus, readExerciseCatalogTerm, readExerciseCatalogSort, sortExerciseCatalog, paginateExerciseCatalog, exerciseCatalogHref, catalogVisiblePageNumbers } from "@/lib/training/exercise-admin-directory";
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

  const orderable = sortExerciseCatalog(filteredExercises,sort);
  const ordered = [
    ...orderable.map(summary => ({key:summary.latestVersion.exercise_id,summary,parent:null as (typeof incompleteParents)[number] | null})),
    ...filteredIncomplete.map(parent => ({key:parent.id,summary:null as (typeof filteredExercises)[number] | null,parent})),
  ];
  const listing = paginateExerciseCatalog(ordered,pagina);
  const pageHref = (page:number) => exerciseCatalogHref({term:searchTerm,status:statusFilter,sort,page,anchor:"biblioteca-exercicios"});
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
            <label className={styles.statusField}><span>Ordenar</span>
              <select name="ordem" defaultValue={sort}>
                <option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option>
                <option value="name-asc">Nome A–Z</option><option value="name-desc">Nome Z–A</option>
                <option value="published">Publicação recente</option><option value="versions">Mais versões</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {searchTerm || statusFilter !== "all" || sort !== "recent" ? (
              <Link className={styles.clearLink} href="/admin/exercicios">Limpar</Link>
            ) : null}
          </form>
        ) : null}
        <p className={styles.resultCount} role="status">
          {listing.total} resultado(s) · {incompleteParents.length} cadastro(s) sem versão inicial.
        </p>
        {listing.invalid ? <p role="status" className={styles.resultCount}>Página inválida ou fora do intervalo; exibindo uma página disponível.</p> : null}
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
              {listing.from}–{listing.to} de {listing.total} registro(s) · Página {listing.page} de {listing.pages}.
            </p>
            <ul className={styles.exerciseList}>
            {listing.items.filter(entry => entry.summary).map(({ summary }) => {
              const { latestVersion: exerciseVersion, latestPublishedVersion } = summary!;
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
                        href={"/admin/exercicios/" + exerciseVersion.exercise_id + pageHref(listing.page).replace("/admin/exercicios","").split("#")[0]}
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
          {listing.items.some(entry=>entry.parent) ? (
            <ul className={styles.exerciseList} aria-label="Cadastros sem versão inicial">
              {listing.items.filter(entry=>entry.parent).map(({parent}) => (
                <li key={parent!.id} className={styles.incompleteRow}>
                  <div>
                    <strong>Exercício sem versão inicial</strong>
                    <p>O cadastro existe, mas nenhuma versão foi registrada. Recupere o rascunho sem publicar.</p>
                  </div>
                  <Link className={styles.openLink} href={`/admin/exercicios/${parent!.id}?status=incomplete&ordem=${sort}&pagina=${listing.page}`}>
                    Retomar versão inicial
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          </>
        )}
        {listing.total > 0 ? <nav aria-label="Páginas da biblioteca de exercícios" className={styles.pagination}>
          <p>{listing.from}–{listing.to} de {listing.total} · Página {listing.page} de {listing.pages}</p>
          {listing.previous ? <Link href={pageHref(listing.previous)}>Anterior</Link> : null}
          {catalogVisiblePageNumbers(listing.page,listing.pages).map(n=>n===listing.page
            ? <strong aria-current="page" key={n}>Página {n}</strong>
            : <Link href={pageHref(n)} key={n}>Página {n}</Link>)}
          {listing.next ? <Link href={pageHref(listing.next)}>Próxima</Link> : null}
        </nav> : null}
      </Section>
    </>
  );
}
