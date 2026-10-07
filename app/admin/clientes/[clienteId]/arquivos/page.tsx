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

      <Section
        description="Consulte os arquivos privados e controle quais uploads administrativos podem ser vistos pela cliente."
        title="Arquivos"
      >
        {files.length === 0 ? (
          <EmptyState
            description="Nenhum arquivo privado está cadastrado para esta cliente."
            title="Sem arquivos cadastrados"
          />
        ) : (
          <ul className={styles.fileList}>
            {files.map((file) => (
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
                    <div>
                      <dt>Tipo</dt>
                      <dd>{file.mime_type || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Tamanho</dt>
                      <dd>{formatFileSize(file.byte_size)}</dd>
                    </div>
                    <div>
                      <dt>Cadastrado em</dt>
                      <dd>{formatCreatedAt(file.created_at)}</dd>
                    </div>
                  </dl>
                  <div className={styles.fileActions}>
                    <Link
                      aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                      className={styles.downloadLink}
                      href={`/admin/arquivos/${file.id}`}
                    >
                      Baixar arquivo
                    </Link>
                    {!file.client_visible_at ? (
                      <AdminPrivateFileReleaseForm
                        clientId={client.id}
                        fileId={file.id}
                      />
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
