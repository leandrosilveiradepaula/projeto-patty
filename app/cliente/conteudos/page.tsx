import { ClientContentCard } from "@/components/client/ClientContentCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listCurrentClientContentReleases,
  listEducationalContentAssetsForCurrentClientVersions,
} from "@/lib/supabase/data-access";
import styles from "./page.module.css";

export default async function ClienteConteudosPage() {
  const client = await getCurrentClient();
  const releases = client
    ? await listCurrentClientContentReleases(client.id)
    : null;
  const releasedVersions =
    releases
      ?.map((release) => release.educational_content_versions)
      .filter((version): version is NonNullable<typeof version> => Boolean(version)) ??
    [];
  const assets = client
    ? await listEducationalContentAssetsForCurrentClientVersions(
        releasedVersions.map((version) => version.id),
      )
    : [];
  const assetsByVersion = new Map<
    string,
    typeof assets
  >();

  for (const asset of assets) {
    const current = assetsByVersion.get(asset.educational_content_version_id) ?? [];
    current.push(asset);
    assetsByVersion.set(asset.educational_content_version_id, current);
  }

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
                    meta={
                      primaryAsset
                        ? `Versão ${contentVersion.version_number}`
                        : `Versão ${contentVersion.version_number} · arquivo ainda indisponível`
                    }
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
                      <Badge variant={primaryAsset ? "positive" : "warning"}>
                        {primaryAsset ? "Disponível" : "Aguardando arquivo"}
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
