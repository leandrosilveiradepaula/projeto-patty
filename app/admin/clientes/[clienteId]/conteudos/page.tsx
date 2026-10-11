import { filterProfessionalReleases, readProfessionalReleaseOptions, professionalReleaseHref } from "@/lib/content/professional-release-explorer";
import { ClientContentReleaseForm } from "@/components/admin/ClientContentReleaseForm";
import { isContentVersionReleaseEligible } from "@/lib/content/release-eligibility";
import { newestClientContentReleases, sortClientContentReleaseOptions } from "@/lib/content/release-order";
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
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import styles from "./page.module.css";

type AdminClientContentPageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ q?: string; arquivo?: string; ordem?: string; pagina?: string }>;
};

function formatRecordedDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return "Não registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientContentPage({
  params, searchParams,
}: AdminClientContentPageProps) {
  const { clienteId } = await params;
  const filters = readProfessionalReleaseOptions(await searchParams);
  if (!isUuid(clienteId)) notFound();
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [releases, contentVersions] = await Promise.all([
    listContentReleasesForAccessibleClient(client.id),
    listEducationalContentVersionsForCurrentAdmin(),
  ]);
  // Asset availability is needed for published candidates and historic
  // releases only, never for unrelated drafts in the global library.
  const assetVersionIds = Array.from(new Set([
    ...contentVersions.filter((version) => version.published_at !== null).map((version) => version.id),
    ...releases.flatMap((release) => release.educational_content_versions?.id
      ? [release.educational_content_versions.id]
      : []),
  ]));
  const assets = await listEducationalContentAssetsForCurrentAdminVersions(assetVersionIds);
  const assetCountsByVersionId = new Map<string, number>();
  for (const asset of assets) {
    const versionId = asset.educational_content_version_id;
    assetCountsByVersionId.set(versionId, (assetCountsByVersionId.get(versionId) ?? 0) + 1);
  }
  const versionIdsWithAssets = new Set(assetCountsByVersionId.keys());
  const parentContentIdByVersionId = new Map(
    contentVersions.map((version) => [version.id, version.educational_content_id]),
  );
  const releasedVersionIds = new Set(
    releases.flatMap((release) =>
      release.educational_content_versions?.id
        ? [release.educational_content_versions.id]
        : [],
    ),
  );
  const availableVersions = sortClientContentReleaseOptions(contentVersions.filter(
    (version) =>
      versionIdsWithAssets.has(version.id) &&
      isContentVersionReleaseEligible({
        alreadyReleased: releasedVersionIds.has(version.id),
        hasAsset: versionIdsWithAssets.has(version.id),
        publishedAt: version.published_at,
      }),
  ));
  const newestReleases = newestClientContentReleases(releases);
  const visibleReleases = newestReleases.filter(
    (release) => Boolean(release.educational_content_versions),
  );
  const missingReleaseVersions = newestReleases.length - visibleReleases.length;
  const explored = filterProfessionalReleases(visibleReleases, assetCountsByVersionId, filters);
  const baseHref = `/admin/clientes/${client.id}/conteudos`;
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
              não aparecem como opção de nova liberação. Versões já publicadas
              não podem receber novos arquivos: prepare uma nova versão em rascunho,
              registre e verifique o asset e publique essa nova versão antes de liberar.
            </p>
            <ul className={styles.contentList}>
              {sortClientContentReleaseOptions(publishedVersionsAwaitingAsset).map((version) => (
                <li key={version.id}>
                  <Link href={`/admin/conteudos/${version.educational_content_id}?versao=${version.id}#assets-do-conteudo`}>
                    {version.title} · versão {version.version_number} · verificar na biblioteca
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className={styles.notice} role="status">
          {availableVersions.length} versão(ões) publicada(s), com arquivo registrado e ainda não liberada(s) para esta cliente.
        </p>
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
        id="historico-liberacoes"
        description="Conteúdos já liberados para esta cliente."
        title="Conteúdos liberados"
      >
        <p className={styles.notice}>
          {visibleReleases.length} liberação(ões) com versão consultável no histórico desta cliente.
        </p>
        {visibleReleases.length > 0 ? (
          <form action={baseHref} className={styles.historyFilters} method="get">
            <label>Buscar<input type="search" name="q" maxLength={160} defaultValue={filters.query} placeholder="Título, categoria ou tipo" /></label>
            <label>Arquivo<select name="arquivo" defaultValue={filters.availability}><option value="all">Todos</option><option value="available">Com arquivo</option><option value="missing">Sem arquivo</option></select></label>
            <label>Ordem<select name="ordem" defaultValue={filters.order}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="title">Título</option></select></label>
            <button type="submit">Filtrar</button>
            <Link href={baseHref + "#historico-liberacoes"}>Limpar filtros</Link>
          </form>
        ) : null}
        {visibleReleases.length > 0 ? <p role="status" className={styles.notice}>Exibindo {explored.first}–{explored.last} de {explored.total} liberações encontradas.</p> : null}
        {visibleReleases.length === 0 ? (
          <EmptyState
            description={missingReleaseVersions > 0
              ? "Há liberações registradas, mas nenhuma versão está disponível nesta consulta. Verifique os registros da biblioteca."
              : "Ainda não há conteúdo liberado para esta cliente. Verifique as versões disponíveis acima ou prepare o material na biblioteca administrativa."}
            title={missingReleaseVersions > 0 ? "Versões liberadas indisponíveis" : "Nenhum conteúdo foi liberado para esta cliente"}
            action={<Link href="/admin/conteudos">Abrir biblioteca de conteúdos</Link>}
          />
        ) : (
          <>
          {missingReleaseVersions > 0 ? (
            <p className={styles.notice} role="status">
              {missingReleaseVersions} liberação(ões) têm versão indisponível nesta consulta.
              Confira a biblioteca antes de depender desses materiais no atendimento.
            </p>
          ) : null}
          {explored.total === 0 ? <EmptyState title="Nenhum conteúdo encontrado" description="Ajuste os filtros; as liberações anteriores estão preservadas." /> : null}
          <ul className={styles.contentList}>
            {explored.items.map((release) => {
              const contentVersion = release.educational_content_versions;
              if (!contentVersion) {
                return null;
              }

              return (
                <li id={`liberacao-${release.id}`} key={release.id}>
                  <ContentListItem
                    category={contentVersion.category_key ?? "Não informado"}
                    meta={`Versão ${contentVersion.version_number} · ${assetCountsByVersionId.get(contentVersion.id) ?? 0} arquivo(s) registrado(s) nesta consulta. Liberado em ${formatRecordedDate(release.released_at)}.`}
                    action={
                      <Link href={
                        parentContentIdByVersionId.has(contentVersion.id)
                          ? `/admin/conteudos/${parentContentIdByVersionId.get(contentVersion.id)}?versao=${contentVersion.id}#assets-do-conteudo`
                          : "/admin/conteudos"
                      }>
                        {versionIdsWithAssets.has(contentVersion.id)
                          ? "Conferir arquivos na biblioteca"
                          : "Verificar arquivo desta versão"}
                      </Link>
                    }
                    status={
                      <Badge
                        variant={
                          versionIdsWithAssets.has(contentVersion.id)
                            ? "positive"
                            : "warning"
                        }
                      >
                        {versionIdsWithAssets.has(contentVersion.id)
                          ? "Arquivo registrado"
                          : "Arquivo não localizado"}
                      </Badge>
                    }
                    title={contentVersion.title}
                    type={contentVersion.content_type_key ?? "Não informado"}
                  />
                </li>
              );
            })}
          </ul>
          {explored.pages > 1 ? <nav className={styles.historyPages} aria-label="Páginas do histórico">
            {explored.previous ? <Link href={professionalReleaseHref(baseHref, filters, explored.previous)}>Anterior</Link> : <span>Anterior</span>}
            <span>Página {explored.page} de {explored.pages}</span>
            {explored.next ? <Link href={professionalReleaseHref(baseHref, filters, explored.next)}>Próxima</Link> : <span>Próxima</span>}
          </nav> : null}
          </>
        )}
      </Section>
    </>
  );
}
