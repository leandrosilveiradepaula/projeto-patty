import { ClientJourneyNextSteps } from "@/components/client/ClientJourneyNextSteps";
import { ClientPrivateFileUploadForm } from "@/components/client/ClientPrivateFileUploadForm";
import { isPreviewablePrivateFileMimeType } from "@/lib/files/private-file-preview";
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
import { formatPrivateFileRecordedAt, formatPrivateFileSize, readPrivateFileKindFilter } from "@/lib/files/private-file-history-view";

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

export default async function ClientFilesPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const kind = readPrivateFileKindFilter(categoria);
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="A identidade de acesso ainda não está vinculada a um cadastro de cliente. Não envie arquivos por outra conta."
        title="Cadastro pendente"
      />
    );
  }

  const files = await listCurrentClientFiles(client.id);
  const filteredFiles = files.filter(file => kind === "all" || file.file_kind === kind);

  return (
    <>
      <PageHeader
        description="Envie fotos, exames e documentos privados para o seu acompanhamento."
        eyebrow="Cliente"
        title="Meus arquivos"
      />

      <Section
        id="enviar-arquivo"
        description="O arquivo passa por uma validação antes de entrar no seu histórico."
        title="Enviar arquivo"
      >
        <ClientPrivateFileUploadForm />
      </Section>

      <Section title="Filtrar meus arquivos" description="Escolha a categoria para localizar documentos do seu acompanhamento.">
        <form action="/cliente/arquivos" method="get" className={styles.fileFilters}>
          <label>Categoria
            <select name="categoria" defaultValue={kind}>
              <option value="all">Todas</option><option value="photo">Fotos</option><option value="exam">Exames</option><option value="document">Documentos</option>
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link href="/cliente/arquivos">Limpar filtros</Link>
        </form>
        <p role="status">{filteredFiles.length} de {files.length} arquivo(s) disponível(is).</p>
      </Section>
      <Section
        action={<Badge variant="neutral">{filteredFiles.length} arquivo(s)</Badge>}
        description="Aqui aparecem os arquivos já validados e liberados para sua conta."
        title="Histórico"
      >
        {filteredFiles.length === 0 ? (
          <EmptyState
            description={files.length === 0 ? "Ainda não há arquivos disponíveis no histórico. Você pode enviar uma foto, um exame ou um documento pelo formulário acima." : "Nenhum arquivo corresponde à categoria escolhida. Limpe os filtros para consultar os demais arquivos."}
            title="Nenhum arquivo disponível"
            action={files.length === 0 ? <a href="#enviar-arquivo">Ir para envio</a> : <Link href="/cliente/arquivos">Limpar filtros</Link>}
          />
        ) : (
          <ul className={styles.fileList}>
            {filteredFiles.map((file) => (
              <li key={file.id}>
                <Card className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <h3 className={styles.fileTitle}>
                      {file.original_filename?.trim() ||
                        "Arquivo sem nome informado"}
                    </h3>
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
                      <dd>{formatPrivateFileSize(file.byte_size)}</dd>
                    </div>
                    <div>
                      <dt>Enviado em</dt>
                      <dd>{formatPrivateFileRecordedAt(file.created_at)}</dd>
                    </div>
                  </dl>
                  <div className={styles.fileActions}>
                    {isPreviewablePrivateFileMimeType(file.mime_type) ? (
                      <a
                        aria-label={`Visualizar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                        className={styles.downloadLink}
                        href={`/cliente/arquivos/${file.id}?preview=1`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Visualizar
                      </a>
                    ) : null}
                  <Link
                    aria-label={`Baixar ${file.original_filename?.trim() || "arquivo sem nome informado"}`}
                    className={styles.downloadLink}
                    href={`/cliente/arquivos/${file.id}`}
                  >
                    Baixar arquivo
                  </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <ClientJourneyNextSteps areas={["assessments","index"]} />
    </>
  );
}
