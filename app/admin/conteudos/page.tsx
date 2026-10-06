import { createEducationalContentDraftAction } from "@/app/admin/conteudos/actions";
import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listEducationalContentVersionsForCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminConteudosPage() {
  const contentVersions = await listEducationalContentVersionsForCurrentAdmin();
  const latestByContent = new Map<
    string,
    (typeof contentVersions)[number]
  >();

  for (const version of contentVersions) {
    const current = latestByContent.get(version.educational_content_id);

    if (!current || version.version_number > current.version_number) {
      latestByContent.set(version.educational_content_id, version);
    }
  }

  const contents = [...latestByContent.values()].sort((left, right) => {
    if (left.display_order !== right.display_order) {
      return left.display_order - right.display_order;
    }

    return left.title.localeCompare(right.title, "pt-BR");
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
        {contents.length === 0 ? (
          <EmptyState
            description="Crie o primeiro rascunho para iniciar a biblioteca."
            title="A biblioteca educacional está vazia"
          />
        ) : (
          <ul className={styles.contentList}>
            {contents.map((contentVersion) => {
              const publishedMeta = contentVersion.published_at
                ? "Publicado em " +
                  formatPublishedDate(contentVersion.published_at) +
                  "."
                : "Versão atual em rascunho.";

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
        )}
      </Section>
    </>
  );
}
