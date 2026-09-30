import { ClientContentReleaseForm } from "@/components/admin/ClientContentReleaseForm";
import { isContentVersionReleaseEligible } from "@/lib/content/release-eligibility";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listContentReleasesForAccessibleClient,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClientContentPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatRecordedDate(value: string | null) {
  if (!value) {
    return "Não registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientContentPage({
  params,
}: AdminClientContentPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [releases, contentVersions] = await Promise.all([
    listContentReleasesForAccessibleClient(client.id),
    listEducationalContentVersionsForCurrentAdmin(),
  ]);
  const releasedVersionIds = new Set(
    releases.flatMap((release) =>
      release.educational_content_versions?.id
        ? [release.educational_content_versions.id]
        : [],
    ),
  );
  const availableVersions = contentVersions.filter((version) =>
    isContentVersionReleaseEligible({
      alreadyReleased: releasedVersionIds.has(version.id),
      publishedAt: version.published_at,
    }),
  );
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Conteúdos liberados"
        status={<Badge variant="neutral">Atribuição ativa</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />
      <Section
        description="Escolha a versão publicada que deve ficar disponível para esta cliente."
        title="Liberar conteúdo"
      >
        {availableVersions.length === 0 ? (
          <EmptyState
            description="Não há versão publicada disponível para uma nova liberação nesta cliente."
            title="Nenhum conteúdo disponível para liberar"
          />
        ) : (
          <Card>
            <ClientContentReleaseForm
              clientId={client.id}
              options={availableVersions.map((version) => ({
                id: version.id,
                title: version.title,
                versionNumber: version.version_number,
              }))}
            />
          </Card>
        )}
      </Section>
      <Section
        description="Conteúdos já liberados e registros de abertura ou conclusão."
        title="Conteúdos liberados"
      >
        {releases.length === 0 ? (
          <EmptyState
            description="Novas liberações aparecerão nesta área."
            title="Nenhum conteúdo foi liberado para esta cliente"
          />
        ) : (
          <ul className={styles.contentList}>
            {releases.map((release) => {
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
                  <ContentListItem
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={`Versão ${contentVersion.version_number}. Liberado em ${formatRecordedDate(release.released_at)}. ${firstOpenedMeta} ${completedMeta}`}
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
