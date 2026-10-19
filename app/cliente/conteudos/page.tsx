import { ClientReleasedContentExplorer, type ReleasedContentDisplayEntry } from "@/components/client/ClientReleasedContentExplorer";
import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { newestClientContentReleases } from "@/lib/content/release-order";
import { educationalAssetKind, educationalAssetOpenLabel, educationalAssetSize, orderReleasedEducationalAssets } from "@/lib/content/client-assets";
import { ClientContentCard } from "@/components/client/ClientContentCard";
import { PrivateEducationalVideoPlayer } from "@/components/content/PrivateEducationalVideoPlayer";
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
import Link from "next/link";

function formatReleaseDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function ClienteConteudosPage() {
  const client = await getCurrentClient();
  const releases = client
    ? await listCurrentClientContentReleases(client.id)
    : null;
  const orderedReleases = newestClientContentReleases(releases ?? []);
  const visibleReleases = orderedReleases.filter(
    (release) => Boolean(release.educational_content_versions),
  );
  const missingVersionCount = orderedReleases.length - visibleReleases.length;
  const releasedVersions = visibleReleases.map(
    (release) => release.educational_content_versions!,
  );
  const releasedVersionIds = Array.from(new Set(releasedVersions.map((version) => version.id)));
  const assets = client
    ? await listEducationalContentAssetsForCurrentClientVersions(
        releasedVersionIds,
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

  const explorerEntries: ReleasedContentDisplayEntry[] = visibleReleases.map((release): ReleasedContentDisplayEntry | null => {
              const contentVersion = release.educational_content_versions;
              if (!contentVersion) {
                return null;
              }

              const releaseAssets = orderReleasedEducationalAssets(
                assetsByVersion.get(contentVersion.id) ?? [],
              );
              const hasPrimaryAsset = releaseAssets.some((asset) => asset.asset_key === "primary");

              return {
                id: release.id,
                title: contentVersion.title,
                category: contentVersion.category_key ?? "Não informado",
                type: contentVersion.content_type_key ?? "Não informado",
                releasedAt: release.released_at,
                assetCount: releaseAssets.length,
                content: (
                  <ClientContentCard
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={
                      releaseAssets.length > 0
                        ? `Versão ${contentVersion.version_number} · liberada em ${formatReleaseDate(release.released_at)} · ${releaseAssets.length} arquivo(s) disponível(is)`
                        : `Versão ${contentVersion.version_number} · liberada em ${formatReleaseDate(release.released_at)} · arquivo ainda indisponível`
                    }
                    action={releaseAssets.length > 0 ? (
                      <ul className={styles.assetList} aria-label={`Arquivos liberados de ${contentVersion.title}`}>
                        {releaseAssets.map((asset, index) => {
                          const label = educationalAssetOpenLabel(
                            asset,
                            index,
                            hasPrimaryAsset,
                          );
                          return (
                            <li className={styles.assetItem} key={asset.id}>
                              {asset.content_type === "video/mp4" ? (
                                <PrivateEducationalVideoPlayer
                                  assetUrl={`/cliente/conteudos/assets/${asset.id}`}
                                  title={contentVersion.title}
                                />
                              ) : null}
                              <a
                                aria-label={`${asset.content_type === "video/mp4" ? "Baixar vídeo" : label} de ${contentVersion.title} em nova aba`}
                                className={styles.openLink}
                                href={`/cliente/conteudos/assets/${asset.id}`}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {asset.content_type === "video/mp4" ? "Baixar vídeo" : label}
                              </a>
                              <span className={styles.assetMeta}>
                                {educationalAssetKind(asset.content_type)} · {educationalAssetSize(asset.byte_size)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    status={
                      <Badge variant={releaseAssets.length > 0 ? "positive" : "warning"}>
                        {releaseAssets.length > 0 ? "Disponível" : "Aguardando arquivo"}
                      </Badge>
                    }
                    title={contentVersion.title}
                    type={contentVersion.content_type_key ?? "Não informado"}
                  />
              )
              };
            }).filter((entry): entry is ReleasedContentDisplayEntry => entry !== null);

  return (
    <>
      <PageHeader
        description="Consulte somente os materiais que a Patty liberou para sua conta. Use o protocolo publicado para conferir refeições e doses."
        eyebrow="Cliente"
        title="Conteúdos"
      />
      <Section description="Cada item corresponde à versão específica que foi liberada para você." title="Biblioteca educacional">
        {!client ? (
          <EmptyState description="Esta conta ainda não está vinculada a um cadastro de cliente. Os conteúdos permanecem privados até que o vínculo e a liberação estejam disponíveis." title="Conteúdos indisponíveis" action={<Link href="/cliente">Voltar ao início</Link>} />
        ) : visibleReleases.length === 0 ? (
          <EmptyState description={orderedReleases.length > 0 ? "Há registros de liberação, mas as respectivas versões não estão disponíveis para consulta nesta conta. Solicite a verificação à Patty." : "Ainda não há conteúdos liberados pela Patty para sua conta. As liberações dependem de uma decisão profissional e aparecerão aqui."} title="Nenhum conteúdo foi liberado para você ainda" action={<Link href="/cliente">Voltar ao início</Link>} />
        ) : <ClientReleasedContentExplorer entries={explorerEntries} missingVersionCount={missingVersionCount} />}
      </Section>
      <ClientJourneyNextSteps areas={["protocol","feedback","training","index"]} />
    </>
  );
}
