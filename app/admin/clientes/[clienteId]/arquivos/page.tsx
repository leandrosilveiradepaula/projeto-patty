import { AdminPrivateFileReleaseForm } from "@/components/admin/AdminPrivateFileReleaseForm";
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
import styles from "./page.module.css";

type AdminClientFilesPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

const fileKindLabels: Record<string, string> = {
  document: "Documento",
  exam: "Exame",
  photo: "Foto",
};

function formatFileSize(value: number | null) {
  if (typeof value !== "number") {
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
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClientFilesPage({
  params,
}: AdminClientFilesPageProps) {
  const { clienteId } = await params;
  const [client, files] = await Promise.all([
    getClientForPrivateFileAdministration(clienteId),
    listAccessibleClientFiles(clienteId),
  ]);

  if (!client) {
    notFound();
  }

  const displayName = client.profiles?.display_name?.trim();
  const pendingReleaseFiles = files.filter(
    (file) =>
      !file.client_visible_at &&
      file.uploaded_by_profile_id !== client.profile_id,
  );
  const historyFiles = files.filter(
    (file) =>
      file.client_visible_at ||
      file.uploaded_by_profile_id === client.profile_id,
  );

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
        description="Arquivos enviados pela Patty ficam ocultos para a cliente até serem liberados explicitamente."
        title="Enviar arquivo em nome da cliente"
      >
        <AdminPrivateFileUploadForm clientId={client.id} />
      </Section>

      {pendingReleaseFiles.length > 0 ? (
        <Section
          action={<Badge variant="warning">{pendingReleaseFiles.length} pendente(s)</Badge>}
          description="Uploads administrativos ainda ocultos para a cliente e que aguardam decisão explícita de liberação."
          title="Aguardando liberação"
        >
          <ul className={styles.fileList}>
            {pendingReleaseFiles.map((file: (typeof files)[number]) => (
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
                        {file.uploaded_by_profile_id === client.profile_id
                          ? "Enviado pela cliente"
                          : "Upload administrativo"}
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
                    <div><dt>Tamanho</dt><dd>{formatFileSize(file.byte_size)}</dd></div>
                    <div><dt>Cadastrado em</dt><dd>{formatCreatedAt(file.created_at)}</dd></div>
                  </dl>
                  <div className={styles.fileActions}>
                    <Link
                      aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                      className={styles.downloadLink}
                      href={`/admin/arquivos/${file.id}`}
                    >
                      Baixar arquivo
                    </Link>
                    {!file.client_visible_at && file.uploaded_by_profile_id !== client.profile_id ? (
                      <AdminPrivateFileReleaseForm clientId={client.id} fileId={file.id} />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        description="Arquivos já liberados para a cliente e arquivos enviados pela própria cliente permanecem disponíveis no histórico privado."
        title="Histórico de arquivos"
      >
        {historyFiles.length === 0 ? (
          <EmptyState
            description={
              pendingReleaseFiles.length > 0
                ? "Os uploads administrativos pendentes aparecem acima. Depois da liberação, eles passam para este histórico."
                : "Nenhum arquivo privado está cadastrado para esta cliente."
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
                        {file.uploaded_by_profile_id === client.profile_id
                          ? "Enviado pela cliente"
                          : "Upload administrativo"}
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
                    <div><dt>Tamanho</dt><dd>{formatFileSize(file.byte_size)}</dd></div>
                    <div><dt>Cadastrado em</dt><dd>{formatCreatedAt(file.created_at)}</dd></div>
                  </dl>
                  <div className={styles.fileActions}>
                    <Link
                      aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                      className={styles.downloadLink}
                      href={`/admin/arquivos/${file.id}`}
                    >
                      Baixar arquivo
                    </Link>
                    {!file.client_visible_at && file.uploaded_by_profile_id !== client.profile_id ? (
                      <AdminPrivateFileReleaseForm clientId={client.id} fileId={file.id} />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
