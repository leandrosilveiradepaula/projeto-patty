import {
  createNextEducationalContentVersionAction,
  publishEducationalContentVersionAction,
  updateEducationalContentDraftAction,
} from "@/app/admin/conteudos/[contentId]/actions";
import { AdminEducationalContentAssetUploadForm } from "@/components/admin/AdminEducationalContentAssetUploadForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleEducationalContentForCurrentAdmin,
  listEducationalContentAssetsForCurrentAdmin,
  listEducationalContentVersionsForCurrentAdmin,
} from "@/lib/supabase/data-access";
import { canPublishEducationalContentVersion } from "@/lib/content/publication-eligibility";
import { isUuid } from "@/lib/validation/uuid";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ contentId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminEducationalContentDetailPage({
  params,
}: PageProps) {
  const { contentId } = await params;

  if (!isUuid(contentId)) {
    notFound();
  }

  const content = await getAccessibleEducationalContentForCurrentAdmin(contentId);

  if (!content) {
    notFound();
  }

  const versions = await listEducationalContentVersionsForCurrentAdmin(content.id);
  const current = versions[0] ?? null;
  const currentAssets = current
    ? await listEducationalContentAssetsForCurrentAdmin(current.id)
    : [];
  const currentCanPublish = current
    ? canPublishEducationalContentVersion({
        contentTypeKey: current.content_type_key,
        hasAsset: currentAssets.length > 0,
      })
    : false;

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
            <form action={createNextEducationalContentVersionAction.bind(null, content.id)}>
              <Button type="submit">Criar nova versão</Button>
            </form>
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

            <form
              action={updateEducationalContentDraftAction.bind(
                null,
                content.id,
                current.id,
              )}
              className={styles.form}
            >
              <label className={styles.field}>
                <span>Título</span>
                <input
                  defaultValue={current.title}
                  maxLength={200}
                  name="title"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Ordem de exibição</span>
                <input
                  defaultValue={current.display_order}
                  min="0"
                  name="displayOrder"
                  required
                  type="number"
                />
              </label>

              <Button type="submit">Salvar rascunho</Button>
            </form>

            <p className={styles.description}>
              Categoria atual: {current.category_key ?? "não definida"} · Tipo
              atual: {current.content_type_key ?? "não definido"} · Fase:{" "}
              {current.phase_key ?? "não vinculada"}.
            </p>

            <form
              action={publishEducationalContentVersionAction.bind(
                null,
                content.id,
                current.id,
              )}
              className={styles.form}
            >
              <label className={styles.confirmation}>
                <input
                  name="confirmPublish"
                  required
                  type="checkbox"
                  value="yes"
                />
                <span>
                  Confirmo que esta versão foi revisada e pode ser publicada.
                </span>
              </label>
              <Button disabled={!currentCanPublish} type="submit">
                Publicar versão
              </Button>
            </form>
            <p className={styles.description}>
              {currentCanPublish
                ? "Publicar torna a versão elegível para liberação manual por cliente. Não há liberação automática."
                : "Esta versão é de vídeo e ainda não possui asset privado verificado registrado. O upload e o registro do asset precisam acontecer antes da publicação."}
            </p>
          </Card>
        )}
      </Section>

      <Section
        description="Metadados técnicos dos arquivos vinculados à versão atual. O binário continua privado no provedor de armazenamento."
        title="Assets da versão atual"
      >
        {!current ? (
          <EmptyState
            description="Crie uma versão antes de registrar assets."
            title="Sem versão atual"
          />
        ) : currentAssets.length === 0 ? (
          <Card>
            <div className={styles.header}>
              <div>
                <h2 className={styles.title}>Nenhum asset registrado</h2>
                <p className={styles.description}>
                  Esta versão ainda não possui arquivo binário associado no
                  Supabase. Isso não publica nem libera nada automaticamente.
                </p>
              </div>
              <Badge variant="warning">Sem asset</Badge>
            </div>
            <p className={styles.description}>
              Selecione o arquivo aprovado. O navegador calcula SHA-256
              localmente e envia o binário diretamente ao Blob privado; o
              servidor continua validando o objeto antes de registrar metadata.
            </p>
            {current.published_at === null ? (
              <AdminEducationalContentAssetUploadForm
                contentId={content.id}
                versionId={current.id}
              />
            ) : (
              <p className={styles.description}>
                Esta versão já foi publicada; assets não são registrados
                retroativamente pela interface.
              </p>
            )}
          </Card>
        ) : (
          <ol className={styles.assetList}>
            {currentAssets.map((asset) => (
              <li key={asset.id}>
                <Card variant="subtle">
                  <div className={styles.header}>
                    <div>
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
                      <Link
                        className={styles.backLink}
                        href={`/admin/conteudos/assets/${asset.id}`}
                        target="_blank"
                      >
                        Abrir arquivo privado
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
        description="Histórico factual das versões já existentes."
        title="Versões"
      >
        <ol className={styles.history}>
          {versions.map((version) => (
            <li key={version.id}>
              <Card variant="subtle">
                <div className={styles.header}>
                  <div>
                    <strong>
                      Versão {version.version_number} · {version.title}
                    </strong>
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
              </Card>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
