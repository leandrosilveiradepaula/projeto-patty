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
        description="Siga as etapas abaixo para preparar, enviar o arquivo e publicar. A liberação para clientes é separada."
        eyebrow="Admin · Conteúdos"
        title={current?.title ?? "Conteúdo educacional"}
      />

      <nav className={styles.stepsNav} aria-label="Etapas do conteúdo">
        <a href="#preparar-conteudo">1. Preparar</a>
        <a href="#assets-do-conteudo">2. Enviar arquivo</a>
        <a href="#publicar-conteudo">3. Publicar</a>
        <a href="#liberar-conteudo">4. Liberar</a>
      </nav>
      <Section
        id="preparar-conteudo"
        description="Confira título, ordem e formato. Salve as mudanças antes de enviar o arquivo."
        title="1. Preparar conteúdo"
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

            {!current.content_type_key ? <p className={styles.description} role="status">Primeiro, selecione Vídeo ou PDF abaixo e clique em Salvar rascunho. O envio do arquivo e a publicação ficam bloqueados até a escolha do formato.</p> : null}
            <AdminEducationalContentDraftSaveForm
              contentId={content.id}
              contentTypeKey={current.content_type_key}
              displayOrder={current.display_order}
              key={JSON.stringify([current.id, current.title, current.display_order])}
              title={current.title}
              versionId={current.id}
            />

            <p className={styles.nextStep} role="status">
              {current.content_type_key
                ? currentAssets.length > 0
                  ? "Dados salvos e arquivo registrado. Confira o material na etapa 2 e siga para publicar."
                  : "Próximo passo: envie e registre o arquivo na etapa 2."
                : "Próximo passo: selecione Vídeo ou PDF e salve o rascunho. Depois envie o arquivo na etapa 2."}
              {" "}<a href="#assets-do-conteudo">Ir para a etapa 2</a>
            </p>
          </Card>
        )}
      </Section>

      {inspected && current && inspected.id !== current.id ? (
        <Card>
          <p role="status" className={styles.nextStep}>
            Você está consultando os arquivos da versão {inspected.version_number} (histórico).
            A etapa de publicação trabalha somente com a versão atual {current.version_number}.
            {" "}<Link href={`/admin/conteudos/${content.id}#assets-do-conteudo`}>Voltar à versão atual</Link>
          </p>
        </Card>
      ) : null}

      <Section
        id="assets-do-conteudo"
        description="Escolha o arquivo aprovado, envie-o ao armazenamento privado e confirme o registro antes de publicar."
        title={inspected ? `2. Enviar arquivo — versão ${inspected.version_number}` : "2. Enviar arquivo"}
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
                <h2 className={styles.title}>Arquivo ainda não enviado</h2>
                <p className={styles.description}>
                  A versão {inspected.version_number} ainda não possui arquivo. Envie e registre o arquivo para continuar.
                </p>
              </div>
              <Badge variant="warning">Sem asset</Badge>
            </div>
            <p className={styles.description}>
              Selecione o PDF ou vídeo aprovado, clique em Enviar arquivo e, ao terminar, confirme o registro. Só depois será possível publicar.
            </p>
            {inspected.id === current?.id && current?.published_at === null && current.content_type_key ? (
              <AdminEducationalContentAssetUploadForm
                contentId={content.id}
                versionId={current.id}
              />
            ) : (
              <p className={styles.description}>
                {current?.published_at === null && !current.content_type_key
                  ? "Para enviar um arquivo, volte à etapa 1, escolha Vídeo ou PDF e salve."
                  : "Esta versão não pode mais receber arquivos. Para alterar o material, crie uma nova versão em rascunho."}
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
                      <details className={styles.technicalDetails}>
                        <summary>Detalhes técnicos do arquivo</summary>
                        <p className={styles.mono}>Provider: {asset.storage_provider}</p>
                        <p className={styles.mono}>Path: {asset.storage_path}</p>
                        <p className={styles.mono}>SHA-256: {asset.sha256_hex}</p>
                      </details>
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
        id="publicar-conteudo"
        description="A publicação é uma decisão da equipe profissional e não libera o material automaticamente para clientes."
        title={current ? `3. Revisar e publicar — versão atual ${current.version_number}` : "3. Revisar e publicar"}
      >
        <Card>
          {!current ? (
            <p className={styles.description}>Crie um rascunho na etapa 1 para continuar.</p>
          ) : current.published_at ? (
            <p className={styles.nextStep}>Versão {current.version_number} publicada. A próxima ação é escolher a cliente autorizada na etapa 4.</p>
          ) : currentCanPublish ? (
            <>
              <p className={styles.nextStep}>Arquivo registrado. Confira o conteúdo na etapa 2 e confirme a publicação abaixo.</p>
              <AdminEducationalContentPublishForm
                canPublish={currentCanPublish}
                contentId={content.id}
                publicationBlockedReason={currentPublicationBlockedReason}
                versionId={current.id}
                versionNumber={current.version_number}
              />
            </>
          ) : (
            <p className={styles.nextStep} role="status">
              {current.content_type_key
                ? "Antes de publicar, envie e registre o arquivo na etapa 2."
                : "Antes de publicar, selecione e salve o formato na etapa 1. Depois envie o arquivo na etapa 2."}
              {" "}<a href={current.content_type_key ? "#assets-do-conteudo" : "#preparar-conteudo"}>Ir para a etapa necessária</a>
            </p>
          )}
        </Card>
      </Section>

      <Section id="liberar-conteudo" title="4. Liberar para clientes" description="Publicar não concede acesso. Cada liberação exige confirmação separada para a cliente e versão exatas.">
        {!releaseReady ? (
          <Card><p className={styles.description}>Primeiro publique uma versão com arquivo registrado. Nenhuma cliente recebe acesso automaticamente.</p></Card>
        ) : activeClients.length === 0 ? (
          <Card><p className={styles.description}>Nenhuma cliente com acompanhamento ativo está disponível para liberação. O conteúdo permanece publicado e privado.</p></Card>
        ) : (
          <Card>
            <p className={styles.description}>Versão {inspected.version_number} · {inspected.title}. Escolha uma cliente para revisar a liberação.</p>
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
