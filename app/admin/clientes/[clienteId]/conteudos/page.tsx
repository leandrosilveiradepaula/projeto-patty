import { ClientContentReleaseForm } from "@/components/admin/ClientContentReleaseForm";
import { isContentVersionReleaseEligible } from "@/lib/content/release-eligibility";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { ContentListItem } from "@/components/admin/ContentListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listContentReleasesForAccessibleClient,
  listEducationalContentAssetsForCurrentAdminVersions,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import Link from "next/link";
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
  const assets = await listEducationalContentAssetsForCurrentAdminVersions(
    contentVersions.map((version) => version.id),
  );
  const versionIdsWithAssets = new Set(
    assets.map((asset) => asset.educational_content_version_id),
  );
  const releasedVersionIds = new Set(
    releases.flatMap((release) =>
      release.educational_content_versions?.id
        ? [release.educational_content_versions.id]
        : [],
    ),
  );
  const availableVersions = contentVersions.filter(
    (version) =>
      versionIdsWithAssets.has(version.id) &&
      isContentVersionReleaseEligible({
        alreadyReleased: releasedVersionIds.has(version.id),
        hasAsset: versionIdsWithAssets.has(version.id),
        publishedAt: version.published_at,
      }),
  );
  const publishedVersionsAwaitingAsset = contentVersions.filter(
    (version) =>
      Boolean(version.published_at) &&
      !releasedVersionIds.has(version.id) &&
      !versionIdsWithAssets.has(version.id),
  );
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Liberações por versão publicada"
        displayName={displayName}
        secondary="Conteúdos liberados"
        status={<Badge variant="neutral">{releases.length} liberação(ões)</Badge>}
      />
      <ClientWorkspaceNav activeArea="conteudos" clientId={client.id} />
      <Section
        description="A liberação individual depende da versão publicada e do arquivo privado verificado. Consulte as demais áreas sem perder o contexto da cliente."
        title="Continuar atendimento"
      >
        <Link href={`/admin/clientes/${client.id}/protocolos`}>Protocolos da cliente</Link>
        {" · "}
        <Link href={`/admin/clientes/${client.id}/feedback-semanal`}>Feedback semanal</Link>
      </Section>
      <div id="liberar-conteudo">
      <Section
        description="Escolha uma versão publicada e com arquivo privado verificado. A liberação é individual e não ocorre automaticamente."
        title="Liberar conteúdo"
      >
        {publishedVersionsAwaitingAsset.length > 0 ? (
          <Card>
            <p className={styles.notice}>
              {publishedVersionsAwaitingAsset.length} versão(ões) publicada(s) ainda
              não possuem arquivo privado registrado e, por segurança operacional,
              não aparecem como opção de nova liberação. Registre e verifique o asset
              na biblioteca antes de liberar para a cliente.
            </p>
          </Card>
        ) : null}
        {availableVersions.length === 0 ? (
          <EmptyState
            description={
              publishedVersionsAwaitingAsset.length > 0
                ? "As versões publicadas restantes aguardam asset privado verificado."
                : "Não há versão publicada disponível para uma nova liberação nesta cliente."
            }
            title="Nenhum conteúdo disponível para liberar"
            action={<Link href="/admin/conteudos">Gerenciar biblioteca de conteúdos</Link>}
          />
        ) : (
          <Card>
            <ClientContentReleaseForm
              clientId={client.id}
              options={availableVersions.map((version) => ({
                id: version.id,
                title: version.title,
                versionNumber: version.version_number,
                hasAsset: versionIdsWithAssets.has(version.id),
              }))}
            />
          </Card>
        )}
      </Section>
      </div>
      <Section
        description="Conteúdos já liberados para esta cliente."
        title="Conteúdos liberados"
      >
        {releases.length === 0 ? (
          <EmptyState
            description="Ainda não há conteúdo liberado para esta cliente. Verifique as versões disponíveis acima ou prepare o material na biblioteca administrativa."
            title="Nenhum conteúdo foi liberado para esta cliente"
            action={<Link href="/admin/conteudos">Abrir biblioteca de conteúdos</Link>}
          />
        ) : (
          <ul className={styles.contentList}>
            {releases.map((release) => {
              const contentVersion = release.educational_content_versions;
              if (!contentVersion) {
                return null;
              }

              return (
                <li key={release.id}>
                  <ContentListItem
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={`Versão ${contentVersion.version_number}. Liberado em ${formatRecordedDate(release.released_at)}.`}
                    status={
                      <Badge
                        variant={
                          versionIdsWithAssets.has(contentVersion.id)
                            ? "positive"
                            : "warning"
                        }
                      >
                        {versionIdsWithAssets.has(contentVersion.id)
                          ? "Disponível para abrir"
                          : "Liberado sem arquivo"}
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
