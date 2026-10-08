import { createEducationalContentDraftAction } from "@/app/admin/conteudos/actions";
import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TextInput } from "@/components/ui/TextInput";
import { summarizeLibraryVersions, matchesLibraryStatus } from "@/lib/content/admin-library-status";
import { listEducationalContentVersionsForCurrentAdmin } from "@/lib/supabase/data-access";
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

type AdminConteudosPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminConteudosPage({ searchParams }: AdminConteudosPageProps) {
  const { q, status } = await searchParams;
  const contentVersions = await listEducationalContentVersionsForCurrentAdmin();
  const summaries = [...summarizeLibraryVersions(contentVersions, (version) => version.educational_content_id).values()]
    .sort((left, right) => {
      if (left.latestVersion.display_order !== right.latestVersion.display_order) {
        return left.latestVersion.display_order - right.latestVersion.display_order;
      }
      return left.latestVersion.title.localeCompare(right.latestVersion.title, "pt-BR");
    });
  const contents = summaries;

  const searchTerm = q?.trim() ?? "";
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const statusFilter = status === "draft" || status === "published" ? status : "all";
  const filteredContents = contents.filter((summary) => {
    const matchesSearch = !normalizedSearchTerm ||
      [summary.latestVersion, summary.latestPublishedVersion].some((version) =>
        version !== null && normalizeSearchValue([version.title, version.category_key, version.content_type_key].filter(Boolean).join(" ")).includes(normalizedSearchTerm),
      );
    return matchesSearch && matchesLibraryStatus(summary, statusFilter);
  });

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
          <form action={createEducationalContentDraftAction} className={styles.createForm}>
            <label className={styles.field}>
              <span>Título</span>
              <input
                maxLength={200}
                name="title"
                placeholder="Ex.: Como utilizar a balança de alimentos"
                required
              />
            </label>
            <label className={styles.orderField}>
              <span>Ordem</span>
              <input defaultValue="0" min="0" name="displayOrder" required type="number" />
            </label>
            <Button type="submit">Criar rascunho</Button>
          </form>
        </Card>
      </Section>

      <Section
        description="Itens publicados podem ser liberados por cliente. Rascunhos permanecem internos."
        title="Biblioteca educacional"
      >
        {contents.length > 0 ? (
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
              <select defaultValue={statusFilter} name="status">
                <option value="all">Todos</option>
                <option value="draft">Rascunhos</option>
                <option value="published">Publicados</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {searchTerm || statusFilter !== "all" ? (
              <Link className={styles.clearLink} href="/admin/conteudos">Limpar</Link>
            ) : null}
          </form>
        ) : null}
        {contents.length === 0 ? (
          <EmptyState
            description="Crie o primeiro rascunho para iniciar a biblioteca."
            title="A biblioteca educacional está vazia"
          />
        ) : filteredContents.length === 0 ? (
          <EmptyState
            description="Ajuste a busca ou limpe os filtros para voltar a ver a biblioteca completa."
            title="Nenhum conteúdo encontrado"
          />
        ) : (
          <>
            <p className={styles.resultCount}>
              {filteredContents.length} de {contents.length} conteúdo(s)
            </p>
            <ul className={styles.contentList}>
            {filteredContents.map(({ latestVersion: contentVersion, latestPublishedVersion }) => {
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
          </>
        )}
      </Section>
    </>
  );
}
