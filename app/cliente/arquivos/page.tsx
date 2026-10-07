import { ClientPrivateFileUploadForm } from "@/components/client/ClientPrivateFileUploadForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import {
  getCurrentClient,
  listCurrentClientFiles,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

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

export default async function ClientFilesPage() {
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Cadastro pendente"
      />
    );
  }

  const files = await listCurrentClientFiles(client.id);

  return (
    <>
      <PageHeader
        description="Envie fotos, exames e documentos privados para o seu acompanhamento."
        eyebrow="Cliente"
        title="Meus arquivos"
      />

      <Section
        description="O arquivo passa por uma validação antes de entrar no seu histórico."
        title="Enviar arquivo"
      >
        <ClientPrivateFileUploadForm />
      </Section>

      <Section
        action={<Badge variant="neutral">{files.length} arquivo(s)</Badge>}
        description="Aqui aparecem os arquivos já validados e liberados para sua conta."
        title="Histórico"
      >
        {files.length === 0 ? (
          <EmptyState
            description="Você ainda não possui arquivos privados validados no histórico."
            title="Nenhum arquivo enviado"
          />
        ) : (
          <ul className={styles.fileList}>
            {files.map((file) => (
              <li key={file.id}>
                <Card className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <div>
                      <h3 className={styles.fileTitle}>
                        {file.original_filename?.trim() ||
                          "Arquivo sem nome informado"}
                      </h3>
                      <p className={styles.fileKind}>
                        {fileKindLabels[file.file_kind] ?? file.file_kind}
                      </p>
                    </div>
                    <Badge variant="neutral">
                      {fileKindLabels[file.file_kind] ?? file.file_kind}
                    </Badge>
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
                      <dt>Enviado em</dt>
                      <dd>{formatCreatedAt(file.created_at)}</dd>
                    </div>
                  </dl>
                  <Link
                    aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                    className={styles.downloadLink}
                    href={`/cliente/arquivos/${file.id}`}
                  >
                    Baixar arquivo
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
