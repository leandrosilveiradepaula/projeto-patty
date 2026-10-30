import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";
import { filterProfessionalReleases, readProfessionalReleaseOptions, professionalReleaseHref, professionalContentReleaseYears } from "@/lib/content/professional-release-explorer";
import { ClientContentReleaseForm } from "@/components/admin/ClientContentReleaseForm";
import { isContentVersionReleaseEligible } from "@/lib/content/release-eligibility";
import { canPublishEducationalContentVersion } from "@/lib/content/publication-eligibility";
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
  searchParams: Promise<{ q?: string; arquivo?: string; ordem?: string; pagina?: string; liberacao?: string; versao?: string; ano?: string; filaRetorno?: string; listaQ?: string; listaView?: string; listaPagina?: string }>;
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
  const rawFilters = await searchParams;
  const directoryReturn = readClientDirectoryReturn(rawFilters);
  const queueReturn = readPendingQueueReturn(rawFilters.filaRetorno);
  const withReturn = (href: string) => withPendingQueueReturn(withClientDirectoryReturn(href, directoryReturn), queueReturn ?? "");
  const filters = readProfessionalReleaseOptions(rawFilters);
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
  const assetsByVersionId = new Map<string, typeof assets>();
  for (const asset of assets) {
    const versionId = asset.educational_content_version_id;
    assetCountsByVersionId.set(versionId, (assetCountsByVersionId.get(versionId) ?? 0) + 1);
    const versionAssets = assetsByVersionId.get(versionId) ?? [];
    versionAssets.push(asset);
    assetsByVersionId.set(versionId, versionAssets);
  }
  // Eligibility is computed server-side from exactly the same private asset
  // integrity facts enforced by the manual release Server Action.
  const releaseReadyVersionIds = new Set(contentVersions.filter(version =>
    canPublishEducationalContentVersion({
      contentTypeKey: version.content_type_key,
      assets: assetsByVersionId.get(version.id) ?? [],
    }),
  ).map(version => version.id));
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
      releaseReadyVersionIds.has(version.id) &&
      isContentVersionReleaseEligible({
        alreadyReleased: releasedVersionIds.has(version.id),
        hasAsset: releaseReadyVersionIds.has(version.id),
        publishedAt: version.published_at,
      }),
  ));
  // Re-evaluate the exact version for each authorized deep link, never trust
  // an arbitrary query parameter as an available release option.
  const initialVersionId = typeof rawFilters.versao === "string" &&
    availableVersions.some((version) => version.id === rawFilters.versao)
    ? rawFilters.versao
    : "";
  const newestReleases = newestClientContentReleases(releases);
  const visibleReleases = newestReleases.filter(
    (release) => Boolean(release.educational_content_versions),
  );
  const missingReleaseVersions = newestReleases.length - visibleReleases.length;
  const releaseYears = professionalContentReleaseYears(visibleReleases);
  const exactPage = authorizedExactRecordPage(
    newestClientContentReleases(visibleReleases),
    rawFilters.liberacao, 12,
  );
  if (exactPage !== null) {
    filters.query = "";
    filters.availability = "all";
    filters.order = "newest";
    filters.year = "all";
    filters.page = exactPage;
  }
  const explored = filterProfessionalReleases(visibleReleases, assetCountsByVersionId, filters);
  const baseHref = `/admin/clientes/${client.id}/conteudos`;
  const publishedVersionsAwaitingAsset = contentVersions.filter(
    (version) =>
      Boolean(version.published_at) &&
      !releasedVersionIds.has(version.id) &&
      !releaseReadyVersionIds.has(version.id),
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
      <div id="liberar-conteudo">
      <Section
        description="Escolha uma versão publicada e com arquivo privado verificado. A liberação é individual e não ocorre automaticamente."
        title="Liberar conteúdo"
      >
        {publishedVersionsAwaitingAsset.length > 0 ? (
          <Card>
            <p className={styles.notice}>
              {publishedVersionsAwaitingAsset.length} versão(ões) publicada(s) não possuem arquivo
              principal compatível e com integridade privada verificada. Elas não aparecem
              como opção de liberação. Versões já publicadas não podem receber novos
              arquivos: prepare uma nova versão em rascunho, registre e verifique o
              arquivo e publique a nova versão antes de liberar.
            </p>
            <ul className={styles.contentList}>
              {sortClientContentReleaseOptions(publishedVersionsAwaitingAsset).map((version) => (
                <li key={version.id}>
                  <Link href={withReturn(`/admin/conteudos/${version.educational_content_id}?versao=${version.id}#assets-do-conteudo`)}>
                    {version.title} · versão {version.version_number} · verificar na biblioteca
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className={styles.notice} role="status">
          {availableVersions.length} versão(ões) publicada(s), com arquivo principal privado verificado e ainda não liberada(s) para esta cliente.
        </p>
        {availableVersions.length === 0 ? (
          <EmptyState
            description={
              publishedVersionsAwaitingAsset.length > 0
                ? "As versões publicadas restantes não possuem arquivo principal privado compatível e verificado. Prepare uma nova versão na biblioteca."
                : "Não há versão publicada disponível para uma nova liberação nesta cliente."
            }
            title="Nenhum conteúdo disponível para liberar"
            action={<Link href={withReturn("/admin/conteudos")}>Gerenciar biblioteca de conteúdos</Link>}
          />
        ) : (
          <Card>
            {/* Reset the action state after an authorized release enters the
                server history so another manual release remains possible. */}
            <ClientContentReleaseForm
              key={`${client.id}:${releases.length}:${initialVersionId}`}
              clientId={client.id}
              initialVersionId={initialVersionId}
              options={availableVersions.map((version) => ({
                id: version.id,
                title: version.title,
                versionNumber: version.version_number,
                hasAsset: releaseReadyVersionIds.has(version.id),
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
             {queueReturn ? <input type="hidden" name="filaRetorno" value={queueReturn} /> : null}
             {directoryReturn.q ? <input type="hidden" name="listaQ" value={directoryReturn.q} /> : null}
             {directoryReturn.view !== "all" ? <input type="hidden" name="listaView" value={directoryReturn.view} /> : null}
             {directoryReturn.page && directoryReturn.page > 1 ? <input type="hidden" name="listaPagina" value={directoryReturn.page} /> : null}
            <label>Buscar<input type="search" name="q" maxLength={160} defaultValue={filters.query} placeholder="Título, categoria ou tipo" /></label>
            <label>Arquivo<select name="arquivo" defaultValue={filters.availability}><option value="all">Todos</option><option value="available">Com arquivo</option><option value="missing">Sem arquivo</option></select></label>
            <label>Ano<select name="ano" defaultValue={filters.year ?? "all"}><option value="all">Todos os anos</option>{releaseYears.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
            <label>Ordem<select name="ordem" defaultValue={filters.order}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="title">Título</option></select></label>
            <button type="submit">Filtrar</button>
            <Link href={withReturn(baseHref + "#historico-liberacoes")}>Limpar filtros</Link>
          </form>
        ) : null}
        {visibleReleases.length > 0 ? <p role="status" className={styles.notice}>Exibindo {explored.first}–{explored.last} de {explored.total} liberações encontradas.</p> : null}
        {visibleReleases.length === 0 ? (
          <EmptyState
            description={missingReleaseVersions > 0
              ? "Há liberações registradas, mas nenhuma versão está disponível nesta consulta. Verifique os registros da biblioteca."
              : "Ainda não há conteúdo liberado para esta cliente. Verifique as versões disponíveis acima ou prepare o material na biblioteca administrativa."}
            title={missingReleaseVersions > 0 ? "Versões liberadas indisponíveis" : "Nenhum conteúdo foi liberado para esta cliente"}
            action={<Link href={withReturn("/admin/conteudos")}>Abrir biblioteca de conteúdos</Link>}
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
                      <Link href={withReturn(
                        parentContentIdByVersionId.has(contentVersion.id)
                          ? `/admin/conteudos/${parentContentIdByVersionId.get(contentVersion.id)}?versao=${contentVersion.id}#assets-do-conteudo`
                          : "/admin/conteudos"
                      )}>
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
            {explored.previous ? <Link href={withReturn(professionalReleaseHref(baseHref, filters, explored.previous))}>Anterior</Link> : <span>Anterior</span>}
            <span>Página {explored.page} de {explored.pages}</span>
            {explored.next ? <Link href={withReturn(professionalReleaseHref(baseHref, filters, explored.next))}>Próxima</Link> : <span>Próxima</span>}
          </nav> : null}
          </>
        )}
      </Section>
      <Section
        description="A liberação individual depende de uma versão publicada com arquivo privado verificado. Continue pelas demais áreas sem perder o contexto da cliente."
        title="Continuar atendimento"
      >
        <Link href={withReturn(`/admin/clientes/${client.id}/protocolos`)}>Protocolos da cliente</Link>
        {" · "}
        <Link href={withReturn(`/admin/clientes/${client.id}/feedback-semanal`)}>Feedback semanal</Link>
      </Section>
    </>
  );
}
