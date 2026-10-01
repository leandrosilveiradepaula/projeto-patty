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
        description="Consulte os materiais educacionais disponíveis para uso no acompanhamento."
        eyebrow="Admin"
        title="Conteúdos"
      />
      <Section
        description="Os conteúdos cadastrados aparecem aqui com seu estado de publicação."
        title="Biblioteca educacional"
      >
        {contentVersions.length === 0 ? (
          <EmptyState
            description="Quando houver conteúdos cadastrados, eles aparecerão aqui."
            title="A biblioteca de conteúdos está vazia"
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
