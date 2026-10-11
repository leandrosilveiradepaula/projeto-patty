import { AdminPrivateFileReleaseForm } from "@/components/admin/AdminPrivateFileReleaseForm";
import { isPreviewablePrivateFileMimeType } from "@/lib/files/private-file-preview";
import { AdminPrivateFileUploadForm } from "@/components/admin/AdminPrivateFileUploadForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Section } from "@/components/ui/Section";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { listAccessibleClientFiles } from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/validation/uuid";
import { formatPrivateFileRecordedAt, formatPrivateFileSize, isPrivateFilePendingProfessionalRelease, matchesPrivateFileFilters, privateFileOriginLabel, readPrivateFileKindFilter, readPrivateFileOriginFilter, readPrivateFileViewFilter } from "@/lib/files/private-file-history-view";
import styles from "./page.module.css";

type AdminClientFilesPageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ categoria?: string; origem?: string; visualizacao?: string }>;
};

const fileKindLabels: Record<string, string> = {
  document: "Documento",
  exam: "Exame",
  photo: "Foto",
};

function formatFileSize(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Tamanho não informado";
  }

  if (value < 1024 * 1024) {
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(value / 1024)} KB`;
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value / (1024 * 1024))} MB`;
}

function formatCreatedAt(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClientFilesPage({
  params,
  searchParams,
}: AdminClientFilesPageProps) {
  const [{ clienteId }, filters] = await Promise.all([params, searchParams]);
  if (!isUuid(clienteId)) notFound();

  const [client, files] = await Promise.all([
    getClientForPrivateFileAdministration(clienteId),
    listAccessibleClientFiles(clienteId),
  ]);

  if (!client) {
    notFound();
  }

  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
  const kind = readPrivateFileKindFilter(filters.categoria);
  const origin = readPrivateFileOriginFilter(filters.origem);
  const view = readPrivateFileViewFilter(filters.visualizacao);
  const filteredFiles = files.filter(file => matchesPrivateFileFilters(file, client.profile_id, kind, origin));
  const pendingReleaseFiles = filteredFiles.filter(file => isPrivateFilePendingProfessionalRelease(file, client.profile_id));
  const historyFiles = filteredFiles.filter(file => !isPrivateFilePendingProfessionalRelease(file, client.profile_id));
  const totalPending = files.filter(file => isPrivateFilePendingProfessionalRelease(file, client.profile_id)).length;

  return (
    <>
      <ClientWorkspaceHeader
        meta="Privacidade e liberação de arquivos"
        displayName={displayName}
        secondary="Fotos, exames e documentos privados"
        status={<Badge variant="neutral">{files.length} arquivo(s)</Badge>}
      />
      <ClientWorkspaceNav activeArea="arquivos" clientId={client.id} />
      <Section
        description="Envie o arquivo em nome da cliente. O upload administrativo permanece privado e oculto até a decisão explícita de liberação."
        title="Enviar arquivo em nome da cliente"
      >
        <AdminPrivateFileUploadForm clientId={client.id} />
      </Section>

      <Section title="Filtrar arquivos" description="Os filtros alteram apenas esta visualização administrativa; não modificam a visibilidade de nenhum arquivo.">
        <form action={`/admin/clientes/${client.id}/arquivos`} method="get" className={styles.fileFilters}>
          <label>Categoria
            <select name="categoria" defaultValue={kind}>
              <option value="all">Todas</option><option value="photo">Fotos</option><option value="exam">Exames</option><option value="document">Documentos</option>
            </select>
          </label>
          <label>Origem
            <select name="origem" defaultValue={origin}>
              <option value="all">Todas</option><option value="client">Cliente</option><option value="team">Equipe ou não identificada</option>
            </select>
          </label>
          <label>Exibição
            <select name="visualizacao" defaultValue={view}>
              <option value="all">Tudo</option><option value="pending">Aguardando liberação</option><option value="history">Histórico</option>
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link href={`/admin/clientes/${client.id}/arquivos`}>Limpar filtros</Link>
        </form>
        <p role="status">{filteredFiles.length} de {files.length} arquivo(s) · {totalPending} aguardando liberação no total.</p>
      </Section>
      {view !== "history" ? <div id="aguardando-liberacao">
        <Section
          action={<Badge variant={pendingReleaseFiles.length > 0 ? "warning" : "neutral"}>{pendingReleaseFiles.length} pendente(s)</Badge>}
          description="Arquivos administrativos ainda ocultos para a cliente. Revise cada arquivo antes de decidir se deve liberá-lo."
          title="Aguardando liberação"
        >
          {pendingReleaseFiles.length === 0 ? (
            <EmptyState
              description="Nenhum upload administrativo está aguardando liberação nesta cliente."
              title="Sem arquivos pendentes"
            />
          ) : (
          <ul className={styles.fileList}>
            {pendingReleaseFiles.map((file: (typeof files)[number]) => (
              <li id={`arquivo-pendente-${file.id}`} key={file.id}>
                <Card className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <h3 className={styles.fileTitle}>
                      {file.original_filename?.trim() || "Arquivo sem nome informado"}
                    </h3>
                    <div className={styles.badges}>
                      <Badge variant="neutral">
                        {fileKindLabels[file.file_kind] ?? file.file_kind}
                      </Badge>
                      <Badge variant="neutral">
                        {privateFileOriginLabel(file, client.profile_id, "admin")}
                      </Badge>
                      <Badge variant={file.client_visible_at ? "positive" : "neutral"}>
                        {file.client_visible_at
                          ? "Visível para cliente"
                          : "Oculto para cliente"}
                      </Badge>
                    </div>
                  </div>
                  <dl className={styles.fileMeta}>
                    <div><dt>Tipo</dt><dd>{file.mime_type || "Não informado"}</dd></div>
                    <div><dt>Tamanho</dt><dd>{formatPrivateFileSize(file.byte_size)}</dd></div>
                    <div><dt>Cadastrado em</dt><dd>{formatPrivateFileRecordedAt(file.created_at)}</dd></div>
                  </dl>
                  <div className={styles.fileActions}>
                    {isPreviewablePrivateFileMimeType(file.mime_type) ? (
                      <a
                        aria-label={`Visualizar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                        className={styles.downloadLink}
                        href={`/admin/arquivos/${file.id}?preview=1`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Visualizar
                      </a>
                    ) : null}
                    <Link
                      aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                      className={styles.downloadLink}
                      href={`/admin/arquivos/${file.id}`}
                    >
                      Baixar arquivo
                    </Link>
                    {!file.client_visible_at && file.uploaded_by_profile_id !== client.profile_id ? (
                      <AdminPrivateFileReleaseForm clientId={client.id} fileId={file.id} fileName={file.original_filename?.trim() || "Arquivo sem nome informado"} />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          )}
        </Section>
      </div> : null}

      {view !== "pending" ? <Section
        description="Histórico privado de arquivos já liberados e de arquivos enviados pela própria cliente. Upload administrativo oculto permanece em Aguardando liberação."
        title="Histórico de arquivos"
      >
        {historyFiles.length === 0 ? (
          <EmptyState
            description={
              pendingReleaseFiles.length > 0
                ? "Os uploads administrativos pendentes aparecem acima. Depois da liberação, eles passam para este histórico."
                 : "Ainda não há arquivos privados cadastrados. Para adicionar um, use o formulário de envio acima."
            }
            title="Sem arquivos no histórico"
          />
        ) : (
          <ul className={styles.fileList}>
            {historyFiles.map((file: (typeof files)[number]) => (
              <li key={file.id}>
                <Card className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <h3 className={styles.fileTitle}>
                      {file.original_filename?.trim() || "Arquivo sem nome informado"}
                    </h3>
                    <div className={styles.badges}>
                      <Badge variant="neutral">
                        {fileKindLabels[file.file_kind] ?? file.file_kind}
                      </Badge>
                      <Badge variant="neutral">
                        {privateFileOriginLabel(file, client.profile_id, "admin")}
                      </Badge>
                      <Badge variant={file.client_visible_at ? "positive" : "neutral"}>
                        {file.client_visible_at
                          ? "Visível para cliente"
                          : "Oculto para cliente"}
                      </Badge>
                    </div>
                  </div>
                  <dl className={styles.fileMeta}>
                    <div><dt>Tipo</dt><dd>{file.mime_type || "Não informado"}</dd></div>
                    <div><dt>Tamanho</dt><dd>{formatPrivateFileSize(file.byte_size)}</dd></div>
                    <div><dt>Cadastrado em</dt><dd>{formatPrivateFileRecordedAt(file.created_at)}</dd></div>
                  </dl>
                  <div className={styles.fileActions}>
                    {isPreviewablePrivateFileMimeType(file.mime_type) ? (
                      <a
                        aria-label={`Visualizar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                        className={styles.downloadLink}
                        href={`/admin/arquivos/${file.id}?preview=1`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Visualizar
                      </a>
                    ) : null}
                    <Link
                      aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                      className={styles.downloadLink}
                      href={`/admin/arquivos/${file.id}`}
                    >
                      Baixar arquivo
                    </Link>
                    {!file.client_visible_at && file.uploaded_by_profile_id !== client.profile_id ? (
                      <AdminPrivateFileReleaseForm clientId={client.id} fileId={file.id} fileName={file.original_filename?.trim() || "Arquivo sem nome informado"} />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section> : null}
    </>
  );
}
