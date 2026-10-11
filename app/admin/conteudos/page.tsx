import {readLibraryExplorerFilters,exploreAdminEducationalLibrary,adminEducationalLibraryHref} from "@/lib/content/admin-library-explorer";
import { AdminEducationalContentCreateForm } from "@/components/admin/AdminEducationalContentCreateForm";
import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { listEducationalContentVersionsForCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";


function formatPublishedDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

type AdminConteudosPageProps = {
  searchParams: Promise<{ q?: string; status?: string; estado?: string; categoria?: string; tipo?: string; ordem?: string; pagina?: string }>;
};

export default async function AdminConteudosPage({ searchParams }: AdminConteudosPageProps) {
  const rawFilters=await searchParams;
  const filters=readLibraryExplorerFilters(rawFilters);
  const contentVersions = await listEducationalContentVersionsForCurrentAdmin();
  const explored=exploreAdminEducationalLibrary(contentVersions,filters);
  const searchTerm=filters.query;

  return (
    <>
      <PageHeader
        description="Crie rascunhos e revise os metadados da biblioteca educacional. Publicação e liberação continuam sendo etapas separadas."
        eyebrow="Admin"
        title="Conteúdos"
      />

      <Section
        description="O novo conteúdo começa sem categoria, tipo, fase ou arquivo. Esses campos não são inferidos automaticamente."
        title="Novo conteúdo educacional"
      >
        <Card className={styles.createCard}>
          <AdminEducationalContentCreateForm />
        </Card>
      </Section>

      <Section
        id="biblioteca-conteudos"
        description="Itens publicados podem ser liberados por cliente. Rascunhos permanecem internos."
        title="Biblioteca educacional"
      >
        {explored.counters.total > 0 ? (
          <form action="/admin/conteudos" className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Buscar conteúdo</span>
              <TextInput
                defaultValue={searchTerm}
                name="q"
                placeholder="Título, categoria ou tipo"
                type="search"
              />
            </label>
            <label className={styles.statusField}>
              <span>Status</span>
              <select defaultValue={filters.state} name="estado">
                <option value="all">Todos</option>
                <option value="latest-draft">Última versão rascunho</option>
                <option value="draft-only">Nunca publicado</option>
                <option value="published-current">Última versão publicada</option>
                <option value="published-with-draft">Publicado com novo rascunho</option>
                <option value="any-published">Com alguma publicação</option>
              </select>
            </label>
            <label className={styles.statusField}><span>Categoria</span><select name="categoria" defaultValue={filters.category}>
              <option value="all">Todas</option>
              {explored.facets.categories.map(value=><option key={value} value={value}>{value}</option>)}
            </select></label>
            <label className={styles.statusField}><span>Tipo</span><select name="tipo" defaultValue={filters.type}>
              <option value="all">Todos</option>
              {explored.facets.types.map(value=><option key={value} value={value}>{value}</option>)}
            </select></label>
            <label className={styles.statusField}><span>Ordenação</span><select name="ordem" defaultValue={filters.order}>
              <option value="display">Ordem da biblioteca</option>
              <option value="title">Título</option>
              <option value="created-recent">Criação recente</option>
              <option value="created-oldest">Criação antiga</option>
              <option value="published-recent">Última publicação</option>
              <option value="version">Número da versão</option>
            </select></label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {filters.query || filters.state !== "all" || filters.category !== "all" || filters.type !== "all" || filters.order !== "display" ? (
              <Link className={styles.clearLink} href="/admin/conteudos">Limpar</Link>
            ) : null}
          </form>
        ) : null}
        <p className={styles.resultCount}>Total: {explored.counters.total} · Nunca publicados: {explored.counters.draftOnly} · Última versão publicada: {explored.counters.publishedCurrent} · Publicados com novo rascunho: {explored.counters.publishedWithDraft}</p>
        {explored.invalidPage ? <p role="status">Página indisponível; exibindo uma página válida.</p> : null}
        {explored.counters.total === 0 ? (
          <EmptyState
            description="Crie o primeiro rascunho para iniciar a biblioteca."
            title="A biblioteca educacional está vazia"
          />
        ) : explored.total === 0 ? (
          <EmptyState
            description="Ajuste a busca ou limpe os filtros para voltar a ver a biblioteca completa."
            title="Nenhum conteúdo encontrado"
          />
        ) : (
          <>
            <p className={styles.resultCount}>
              {explored.from}–{explored.to} de {explored.total} conteúdo(s) encontrado(s)
            </p>
            <ul className={styles.contentList}>
            {explored.items.map(({ latestVersion: contentVersion, latestPublishedVersion }) => {
              const publishedMeta = contentVersion.published_at
                ? "Publicado em " + formatPublishedDate(contentVersion.published_at) + "."
                : latestPublishedVersion
                  ? `Versão atual em rascunho. Versão ${latestPublishedVersion.version_number} permanece publicada.`
                  : "Versão atual em rascunho; nenhuma versão publicada.";

              return (
                <li key={contentVersion.educational_content_id}>
                  <ContentListItem
                    action={
                      <Link
                        aria-label={`Abrir conteúdo ${contentVersion.title}`}
                        className={styles.openLink}
                        href={
                          "/admin/conteudos/" +
                          contentVersion.educational_content_id
                        }
                      >
                        Abrir
                      </Link>
                    }
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={
                      "Versão " +
                      contentVersion.version_number +
                      ". " +
                      publishedMeta
                    }
                    status={
                      <Badge
                        variant={
                          contentVersion.published_at ? "positive" : "warning"
                        }
                      >
                        {contentVersion.published_at ? "Publicado" : "Rascunho"}
                      </Badge>
                    }
                    title={contentVersion.title}
                    type={contentVersion.content_type_key ?? "Não informado"}
                  />
                </li>
              );
            })}
          </ul>
          {explored.total > 0 ? <nav className={styles.pagination} aria-label="Páginas da biblioteca educacional">
            <span>Página {explored.page} de {explored.pages}</span>
            {explored.previous ? <Link href={adminEducationalLibraryHref(filters,explored.previous)}>Anterior</Link> : null}
            {explored.next ? <Link href={adminEducationalLibraryHref(filters,explored.next)}>Próxima</Link> : null}
          </nav> : null}
          </>
        )}
      </Section>
    </>
  );
}
