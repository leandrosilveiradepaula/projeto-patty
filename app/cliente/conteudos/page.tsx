import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
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
import Link from "next/link";

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
            description="Esta conta ainda não está vinculada a um cadastro de cliente. Os conteúdos permanecem privados até que o vínculo e a liberação estejam disponíveis."
            title="Conteúdos indisponíveis"
            action={<Link href="/cliente">Voltar ao início</Link>}
          />
        ) : releases?.length === 0 ? (
          <EmptyState
            description="Ainda não há conteúdos liberados pela Patty para sua conta. As liberações dependem de uma decisão profissional e aparecerão aqui."
            title="Nenhum conteúdo foi liberado para você ainda"
            action={<Link href="/cliente">Voltar ao início</Link>}
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
      <ClientJourneyNextSteps areas={["protocol","training","index"]} />
    </>
  );
}
