import { ClientContentCard } from "@/components/client/ClientContentCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listCurrentClientContentReleases,
  listEducationalContentAssetsForCurrentClient,
} from "@/lib/supabase/data-access";
import styles from "./page.module.css";

export default async function ClienteConteudosPage() {
  const client = await getCurrentClient();
  const releases = client
    ? await listCurrentClientContentReleases(client.id)
    : null;
  const assetsByVersion = new Map(
    client && releases
      ? await Promise.all(
          releases
            .map((release) => release.educational_content_versions)
            .filter((version): version is NonNullable<typeof version> => Boolean(version))
            .map(async (version) => [
              version.id,
              await listEducationalContentAssetsForCurrentClient(version.id),
            ] as const),
        )
      : [],
  );

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
              if (!contentVersion) {
                return null;
              }

              const assets = assetsByVersion.get(contentVersion.id) ?? [];
              const primaryAsset =
                assets.find((asset) => asset.asset_key === "primary") ?? assets[0] ?? null;

              return (
                <li key={release.id}>
                  <ClientContentCard
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={`Versão ${contentVersion.version_number}`}
                    action={
                      primaryAsset ? (
                        <a
                          aria-label={`Abrir conteúdo ${contentVersion.title} em nova aba`}
                          className={styles.openLink}
                          href={`/cliente/conteudos/assets/${primaryAsset.id}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Abrir conteúdo
                        </a>
                      ) : null
                    }
                    status={
                      <Badge variant={primaryAsset ? "positive" : "neutral"}>
                        {primaryAsset ? "Disponível" : "Liberado"}
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
