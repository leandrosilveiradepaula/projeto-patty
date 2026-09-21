import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { listEducationalContentVersionsForCurrentAdmin } from "@/lib/supabase/data-access";
import styles from "./page.module.css";

export default async function AdminConteudosPage() {
  const contentVersions = await listEducationalContentVersionsForCurrentAdmin();

  return (
    <>
      <PageHeader
        description="Biblioteca educacional, separada da biblioteca de exercícios."
        eyebrow="Admin"
        title="Conteúdos"
      />
      <Section
        description="As versões são exibidas individualmente para preservar o histórico editorial."
        title="Biblioteca educacional"
      >
        {contentVersions.length === 0 ? (
          <EmptyState
            description="As versões cadastradas aparecerão nesta biblioteca."
            title="Nenhum conteúdo educacional cadastrado"
          />
        ) : (
          <ul className={styles.contentList}>
            {contentVersions.map((contentVersion) => (
              <li key={contentVersion.id}>
              <ContentListItem
                category={contentVersion.category_key ?? "Não informado"}
                meta={`Versão ${contentVersion.version_number}`}
                status={
                  <Badge variant="neutral">
                    {contentVersion.published_at ? "Publicado" : "Não publicado"}
                  </Badge>
                }
                title={contentVersion.title}
                type={contentVersion.content_type_key ?? "Não informado"}
              />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
