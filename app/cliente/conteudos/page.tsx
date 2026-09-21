import { ClientContentCard } from "@/components/client/ClientContentCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getCurrentClient, listCurrentClientContentReleases } from "@/lib/supabase/data-access";
import styles from "./page.module.css";

function formatRecordedDate(value: string | null) {
  if (!value) {
    return "Não registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function ClienteConteudosPage() {
  const client = await getCurrentClient();
  const releases = client
    ? await listCurrentClientContentReleases(client.id)
    : null;

  return (
    <>
      <PageHeader
        description="Conteúdos educacionais liberados para a sua conta."
        eyebrow="Cliente"
        title="Conteúdos"
      />
      <Section
        description="Cada item corresponde à versão específica que foi liberada para você."
        title="Biblioteca educacional"
      >
        {!client ? (
          <EmptyState
            description="Sua conta ainda não está vinculada a uma cliente."
            title="Conteúdos indisponíveis"
          />
        ) : releases?.length === 0 ? (
          <EmptyState
            description="Novas liberações aparecerão nesta biblioteca."
            title="Nenhum conteúdo foi liberado para você ainda"
          />
        ) : (
          <ul className={styles.contentList}>
            {releases?.map((release) => {
              const contentVersion = release.educational_content_versions;
              const progress = release.client_content_progress[0] ?? null;

              if (!contentVersion) {
                return null;
              }

              const firstOpenedMeta = progress?.first_opened_at
                ? `Primeira abertura registrada em ${formatRecordedDate(progress.first_opened_at)}.`
                : "Nenhuma abertura registrada.";
              const completedMeta = progress?.completed_at
                ? `Conclusão registrada em ${formatRecordedDate(progress.completed_at)}.`
                : "Nenhuma conclusão registrada.";

              return (
                <li key={release.id}>
                  <ClientContentCard
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={`Versão ${contentVersion.version_number}. ${firstOpenedMeta} ${completedMeta}`}
                    status={<Badge variant="neutral">Liberado</Badge>}
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
