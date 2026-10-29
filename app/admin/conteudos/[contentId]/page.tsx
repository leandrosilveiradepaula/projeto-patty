import {readContentVersionFilter,inspectContentVersionArchive,contentVersionArchiveHref} from "@/lib/content/version-archive";
import {
  AdminEducationalContentDraftSaveForm,
  AdminEducationalContentNewVersionForm,
  AdminEducationalContentPublishForm,
} from "@/components/admin/AdminEducationalContentVersionForms";
import { AdminEducationalContentAssetUploadForm } from "@/components/admin/AdminEducationalContentAssetUploadForm";
import { PrivateEducationalVideoPlayer } from "@/components/content/PrivateEducationalVideoPlayer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentAssetsForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
  listEducationalContentAssetsForCurrentAdminVersions,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";
import {
  canPublishEducationalContentVersion,
  educationalContentPublicationBlockReason,
} from "@/lib/content/publication-eligibility";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ versao?: string; busca?: string; estado?: string; arquivo?: string; ordem?: string; pagina?: string }>;
};

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminEducationalContentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ contentId }, raw] = await Promise.all([params, searchParams]);
  const {versao}=raw;
  const filters=readContentVersionFilter(raw);

  if (!isUuid(contentId)) {
    notFound();
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    notFound();
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(content.id);
  const current = versions[0] ?? null;
  const allAssetRefs=await listEducationalContentAssetsForCurrentAdminVersions(versions.map(v=>v.id));
  const assetCounts=new Map<string,number>();
  for(const asset of allAssetRefs){
    assetCounts.set(asset.educational_content_version_id,(assetCounts.get(asset.educational_content_version_id)??0)+1);
  }
  const archive=inspectContentVersionArchive(versions,assetCounts,filters,versao);
  // Only a version already visible under the professional RLS can be inspected.
  const inspected = versions.find((version) => version.id === versao) ?? current;
  const [currentAssets, inspectedAssets] = await Promise.all([
    current ? listEducationalContentAssetsForCurrentAdmin(current.id) : Promise.resolve([]),
    inspected && inspected.id !== current?.id
      ? listEducationalContentAssetsForCurrentAdmin(inspected.id)
      : Promise.resolve(null),
  ]);
  const visibleAssets = inspectedAssets ?? currentAssets;
  const releaseReady = inspected?.published_at
    ? canPublishEducationalContentVersion({
        contentTypeKey: inspected.content_type_key,
        assets: visibleAssets,
      })
    : false;
  const activeAssignments = releaseReady ? await listClientsAssignedToCurrentAdmin() : [];
  const activeClients = activeAssignments.flatMap((assignment) =>
    assignment.clients ? [assignment.clients] : [],
  );
  const currentCanPublish = current
    ? canPublishEducationalContentVersion({
        contentTypeKey: current.content_type_key,
        assets: currentAssets,
      })
    : false;
  const currentPublicationBlockedReason = current
    ? educationalContentPublicationBlockReason({
        contentTypeKey: current.content_type_key,
        assets: currentAssets,
      })
    : "Não foi possível localizar a versão atual.";

  return (
    <>
      <PageHeader
        actions={
          <Link className={styles.backLink} href="/admin/conteudos">
            Voltar à biblioteca
          </Link>
        }
        description="Edite metadados de rascunho sem publicar nem liberar conteúdo automaticamente."
        eyebrow="Admin · Conteúdos"
        title={current?.title ?? "Conteúdo educacional"}
      />

      <Section
        description="Esta etapa não define taxonomia, direitos/licenciamento, arquivo de mídia ou liberação para clientes."
        title="Rascunho"
      >
        {!current ? (
          <EmptyState
            description="Este conteúdo não possui versão cadastrada."
            title="Sem versão"
          />
        ) : current.published_at ? (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>{current.title}</h2>
                <p className={styles.description}>
                  Versão {current.version_number} publicada em{" "}
                  {formatDateTime(current.published_at)}.
                </p>
              </div>
              <Badge variant="positive">Publicado</Badge>
            </div>
            <p className={styles.description}>
              A interface não altera versões publicadas. Mudanças posteriores são
              feitas em uma nova versão.
            </p>
            <AdminEducationalContentNewVersionForm contentId={content.id} />
          </Card>
        ) : (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>Versão {current.version_number}</h2>
                <p className={styles.description}>
                  Criada em {formatDateTime(current.created_at)}.
                </p>
              </div>
              <Badge variant="warning">Rascunho</Badge>
            </div>

            <AdminEducationalContentDraftSaveForm
              contentId={content.id}
              contentTypeKey={current.content_type_key}
              displayOrder={current.display_order}
              key={JSON.stringify([current.id, current.title, current.display_order])}
              title={current.title}
              versionId={current.id}
            />

            <p className={styles.description}>
              Categoria atual: {current.category_key ?? "não definida"} · Tipo
              atual: {current.content_type_key ?? "não definido"} · Fase:{" "}
              {current.phase_key ?? "não vinculada"}.
            </p>

            <AdminEducationalContentPublishForm
              canPublish={currentCanPublish}
              contentId={content.id}
              publicationBlockedReason={currentPublicationBlockedReason}
              versionId={current.id}
              versionNumber={current.version_number}
            />
            <p className={styles.description}>
              {currentCanPublish
                ? "Após publicar, esta versão com arquivo poderá ser liberada manualmente para cada cliente. Não há liberação automática."
                : currentPublicationBlockedReason}
            </p>
          </Card>
        )}
      </Section>

      {releaseReady ? (
        <Section title="Liberar esta versão para uma cliente" description="A publicação não concede acesso automático. Selecione um acompanhamento autorizado e confirme a versão exata na tela individual.">
          {activeClients.length === 0 ? (
            <Card><p className={styles.description}>Nenhuma cliente em acompanhamento ativo está disponível para liberação. O material permanece publicado e privado.</p></Card>
          ) : (
            <Card>
              <p className={styles.description}>Versão {inspected.version_number} · {inspected.title}. Selecione uma cliente para revisar a liberação.</p>
              <ul className={styles.releaseClientList}>
                {activeClients.map((client) => (
                  <li key={client.id}>
                    <Link className={styles.backLink} href={`/admin/clientes/${client.id}/conteudos?versao=${inspected.id}#liberar-conteudo`}>
                      {client.full_name?.trim() || client.profiles?.display_name?.trim() || "Cliente sem nome informado"} · revisar liberação
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Section>
      ) : null}
      <Section
        id="assets-do-conteudo"
        description="Consulte os arquivos da versão selecionada. O binário permanece privado no provedor de armazenamento."
        title={inspected ? `Arquivos da versão ${inspected.version_number}` : "Arquivos"}
      >
        {!inspected ? (
          <EmptyState
            description="Crie uma versão antes de registrar assets."
            title="Sem versão atual"
          />
        ) : visibleAssets.length === 0 ? (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>Nenhum asset registrado</h2>
                <p className={styles.description}>
                  A versão {inspected.version_number} ainda não possui arquivo registrado.
                  Isso não publica nem libera nada automaticamente.
                </p>
              </div>
              <Badge variant="warning">Sem asset</Badge>
            </div>
            <p className={styles.description}>
              Selecione o arquivo aprovado. O navegador calcula SHA-256
              localmente e envia o binário diretamente ao Blob privado; o
              servidor continua validando o objeto antes de registrar metadata.
            </p>
            {inspected.id === current?.id && current?.published_at === null ? (
              <AdminEducationalContentAssetUploadForm
                contentId={content.id}
                versionId={current.id}
              />
            ) : (
              <p className={styles.description}>
                Uma versão histórica ou publicada não pode receber arquivos
                retroativamente. Selecione o rascunho atual para incluir novo asset.
              </p>
            )}
          </Card>
        ) : (
          <ol className={styles.assetList}>
            {visibleAssets.map((asset) => (
              <li key={asset.id}>
                <Card variant="subtle">
                  <div className={styles.header}>
                    <div className={styles.assetDetails}>
                      <strong>{asset.asset_key}</strong>
                      <p className={styles.description}>
                        {asset.content_type} · {asset.byte_size.toLocaleString("pt-BR")} bytes
                      </p>
                      <p className={styles.mono}>
                        Provider: {asset.storage_provider}
                      </p>
                      <p className={styles.mono}>
                        Path: {asset.storage_path}
                      </p>
                      <p className={styles.mono}>
                        SHA-256: {asset.sha256_hex}
                      </p>
                      {asset.content_type === "video/mp4" ? (
                        <PrivateEducationalVideoPlayer
                          assetUrl={`/admin/conteudos/assets/${asset.id}`}
                          title={inspected.title}
                        />
                      ) : null}
                      <Link
                        className={styles.backLink}
                        href={`/admin/conteudos/assets/${asset.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {asset.content_type === "video/mp4" ? "Baixar vídeo privado" : "Abrir arquivo privado"}
                      </Link>
                    </div>
                    <Badge variant="positive">Registrado</Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        id="historico-versoes-conteudos"
        description="Histórico factual das versões já existentes."
        title="Versões"
      >
        <form action={"/admin/conteudos/"+content.id} method="get" className={styles.historyFilters}>
          <label>Buscar número ou título<input type="search" name="busca" defaultValue={filters.query} maxLength={120} /></label>
          <label>Estado<select name="estado" defaultValue={filters.status}><option value="all">Todas</option><option value="draft">Rascunhos</option><option value="published">Publicadas</option></select></label>
          <label>Arquivo<select name="arquivo" defaultValue={filters.asset}><option value="all">Todos</option><option value="with-asset">Com arquivo</option><option value="without-asset">Sem arquivo</option></select></label>
          <label>Ordem<select name="ordem" defaultValue={filters.order}><option value="newest">Versões recentes</option><option value="oldest">Versões antigas</option><option value="title">Título</option></select></label>
          <button type="submit">Filtrar versões</button>
          <Link href={contentVersionArchiveHref("/admin/conteudos/"+content.id,readContentVersionFilter({}),1)}>Limpar filtros</Link>
        </form>
        <p className={styles.description}>Total: {archive.counts.total} · Publicadas: {archive.counts.published} · Rascunhos: {archive.counts.draft} · Com arquivo: {archive.counts.withAsset} · Sem arquivo: {archive.counts.withoutAsset}</p>
        <p role="status" className={styles.description}>Exibindo {archive.from}–{archive.to} de {archive.total} versões encontradas.</p>
        {archive.invalidPage ? <p role="status">Página indisponível; exibindo uma página válida.</p> : null}
        {archive.selectedHidden ? <p role="status">A versão selecionada não corresponde aos filtros. Limpe os filtros para consultá-la.</p> : null}
        {archive.total===0 ? <p>Nenhuma versão corresponde aos filtros.</p> : null}
        <ol className={styles.history}>
          {archive.items.map((version) => (
            <li id={`versao-conteudo-${version.id}`} key={version.id}>
              <Card variant="subtle">
                <div className={styles.header}>
                  <div>
                    <strong>
                      Versão {version.version_number} · {version.title}
                    </strong>
                    <p className={styles.description}>Arquivos registrados: {assetCounts.get(version.id)??0}</p>
                    <p className={styles.description}>
                      Criada em {formatDateTime(version.created_at)}
                      {version.published_at
                        ? " · publicada em " + formatDateTime(version.published_at)
                        : " · rascunho"}
                    </p>
                  </div>
                  <Badge variant={version.published_at ? "positive" : "warning"}>
                    {version.published_at ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                <Link className={styles.backLink} href={`?versao=${version.id}#assets-do-conteudo`}>
                  {version.id === inspected?.id ? "Ver arquivos desta versão (selecionada)" : "Ver arquivos desta versão"}
                </Link>
              </Card>
            </li>
          ))}
        </ol>
        {archive.total>0 ? <nav className={styles.historyPagination} aria-label="Páginas de versões do conteúdo">
          <span>Página {archive.page} de {archive.pages}</span>
          {archive.previous ? <Link href={contentVersionArchiveHref("/admin/conteudos/"+content.id,filters,archive.previous)}>Anterior</Link> : null}
          {archive.next ? <Link href={contentVersionArchiveHref("/admin/conteudos/"+content.id,filters,archive.next)}>Próxima</Link> : null}
        </nav> : null}
      </Section>
    </>
  );
}
