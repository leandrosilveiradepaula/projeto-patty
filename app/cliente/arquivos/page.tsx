import { readPrivateFileDiscovery, matchesPrivateFileDiscovery, privateFileReleaseYears, PRIVATE_FILE_DISCOVERY_MONTHS } from "@/lib/files/private-file-discovery";
import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { availablePrivateFileYears, matchesPrivateFileMetadata, readPrivateFileMetadataFilters } from "@/lib/files/private-file-metadata-filters";
import { PrivatePhotoComparison } from "@/components/files/PrivatePhotoComparison";
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
import { formatPrivateFileRecordedAt, formatPrivateFileSize, matchesPrivateFileFilters, privateFileOriginLabel, readPrivateFileKindFilter, readPrivateFileOriginFilter } from "@/lib/files/private-file-history-view";

import { matchesPrivateFilePreviewFilter, paginatePrivateFileHistory, privateFileHistoryHref, readPrivateFileHistoryPage, readPrivateFileHistorySort, readPrivateFilePreviewFilter, sortPrivateFileHistory, countPrivateFileCategories, visiblePrivateFilePageNumbers } from "@/lib/files/private-file-history-workspace";

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

export default async function ClientFilesPage({ searchParams }: { searchParams: Promise<{ categoria?: string; origem?: string; formato?: string; ordem?: string; pagina?: string; fotoAntes?: string; fotoDepois?: string; ano?: string; tamanho?: string; mes?: string; dataInicial?: string; dataFinal?: string; minKb?: string; maxKb?: string; grupoMime?: string; integridadeData?: string; anoLiberacao?: string; mesLiberacao?: string; nome?: string; estadoLiberacao?: string; arquivo?: string }> }) {
  const { categoria, origem, formato, ordem, pagina, fotoAntes, fotoDepois, ano, tamanho, mes, dataInicial, dataFinal, minKb, maxKb, grupoMime, integridadeData, anoLiberacao, mesLiberacao, nome, estadoLiberacao, arquivo } = await searchParams;
  const kind = readPrivateFileKindFilter(categoria);
  const origin = readPrivateFileOriginFilter(origem);
  const preview = readPrivateFilePreviewFilter(formato);
  const invalidScopeFilter =
    (categoria !== undefined && categoria !== "all" && kind === "all") ||
    (origem !== undefined && origem !== "all" && origin === "all");
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
  const years = availablePrivateFileYears(files);
  const releaseYears = privateFileReleaseYears(files);
  const exactFile = typeof arquivo === "string" && files.some(row=>row.id===arquivo);
  const metadata = exactFile ? { year:"all", size:"all" as const, invalid:false } : readPrivateFileMetadataFilters({ano,tamanho},years);
  const discovery=readPrivateFileDiscovery(exactFile ? {} : {mes,dataInicial,dataFinal,minKb,maxKb,grupoMime,integridadeData,anoLiberacao,mesLiberacao,nome,estadoLiberacao}, releaseYears);
  const advancedFiltersActive = !exactFile && [mes,dataInicial,dataFinal,minKb,maxKb,grupoMime,integridadeData,anoLiberacao,mesLiberacao,nome,estadoLiberacao].some(value => typeof value === "string" && value !== "" && value !== "all");
  const displayKind = exactFile ? "all" as const : kind;
  const displayOrigin = exactFile ? "all" as const : origin;
  const displayPreview = exactFile ? {value:"all" as const,invalid:false} : preview;
  const order = readPrivateFileHistorySort(exactFile ? undefined : ordem);
  const requestedPage = readPrivateFileHistoryPage(pagina);
  const filteredFiles = sortPrivateFileHistory(
    files.filter(file => matchesPrivateFileFilters(file, client.profile_id, displayKind, displayOrigin)
      && matchesPrivateFilePreviewFilter(file.mime_type, displayPreview.value)
      && matchesPrivateFileMetadata(file,metadata)
      && matchesPrivateFileDiscovery(file,discovery)),
    order.value,
  );
  const exactPage = authorizedExactRecordPage(filteredFiles,arquivo,12);
  const visiblePage = paginatePrivateFileHistory(filteredFiles, exactPage ?? requestedPage.page);
  const categories = countPrivateFileCategories(files);
  const historyPath = "/cliente/arquivos";
  const historyHref = (page: number) => privateFileHistoryHref(historyPath, { categoria: displayKind, origem: displayOrigin, formato: displayPreview.value, ordem: order.value, ano: metadata.year, tamanho:metadata.size,mes:discovery.month,dataInicial:discovery.fromDate,dataFinal:discovery.toDate,minKb:discovery.minKb,maxKb:discovery.maxKb,grupoMime:discovery.mimeFamily,integridadeData:discovery.recordedValidity,anoLiberacao:discovery.releaseYear,mesLiberacao:discovery.releaseMonth,nome:discovery.namePresence,estadoLiberacao:discovery.releaseState,pagina: page, anchor: "lista-arquivos" });

  return (
    <>
      <PageHeader
        description="Envie fotos, exames e documentos privados para o seu acompanhamento."
        eyebrow="Cliente"
        title="Meus arquivos"
      />

      <PrivatePhotoComparison files={files} clientId={client.id} before={fotoAntes} after={fotoDepois} path="/cliente/arquivos" fileRoute="/cliente/arquivos" returnHref={privateFileHistoryHref("/cliente/arquivos",{categoria:kind,origem:origin,formato:preview.value,ordem:readPrivateFileHistorySort(ordem).value})} />
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
            <select name="categoria" defaultValue={displayKind}>
              <option value="all">Todas</option><option value="photo">Fotos</option><option value="exam">Exames</option><option value="document">Documentos</option>
            </select>
          </label>
          <label>Origem
            <select name="origem" defaultValue={displayOrigin}>
              <option value="all">Todas</option>
              <option value="client">Enviados por mim</option>
              <option value="team">Equipe ou origem não identificada</option>
            </select>
          </label>
          <label>Disponibilidade
            <select name="formato" defaultValue={displayPreview.value}>
              <option value="all">Todos os formatos</option>
              <option value="previewable">Com prévia compatível</option>
              <option value="download_only">Apenas download</option>
            </select>
          </label>
          <label>Ano do arquivo
            <select name="ano" defaultValue={metadata.year}>
              <option value="all">Todos os anos</option>
              {years.map(year=><option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>Metadados do tamanho
            <select name="tamanho" defaultValue={metadata.size}>
              <option value="all">Todos</option><option value="known">Com tamanho registrado</option><option value="unknown">Tamanho não informado</option>
            </select>
          </label>
          <details className={styles.advancedFilters} open={advancedFiltersActive}>
            <summary>Mais filtros de arquivos${advancedFiltersActive ? " · filtros avançados ativos" : ""}</summary>
            <div className={styles.advancedFilterFields}>
                     <label>Registro desde<input name="dataInicial" type="date" defaultValue={discovery.fromDate ?? ""} /></label>
           <label>Registro até<input name="dataFinal" type="date" defaultValue={discovery.toDate ?? ""} /></label>
           <label>Mês de registro<select name="mes" defaultValue={discovery.month}><option value="all">Todos</option>{PRIVATE_FILE_DISCOVERY_MONTHS.map(month=><option key={month} value={month}>{month}</option>)}</select></label>
           <label>Tamanho mínimo (KB)<input name="minKb" type="number" min="0" max="2097151" defaultValue={discovery.minKb ?? ""} /></label>
           <label>Tamanho máximo (KB)<input name="maxKb" type="number" min="0" max="2097151" defaultValue={discovery.maxKb ?? ""} /></label>
           <label>Família do formato<select name="grupoMime" defaultValue={discovery.mimeFamily}><option value="all">Todas</option><option value="image">Imagens</option><option value="pdf">PDF</option><option value="video">Vídeos</option><option value="audio">Áudios</option><option value="other">Outros</option><option value="unknown">Não informado</option></select></label>
           <label>Data de registro<select name="integridadeData" defaultValue={discovery.recordedValidity}><option value="all">Todas</option><option value="valid">Data válida</option><option value="invalid">Data indisponível</option></select></label>
           <label>Ano de liberação<select name="anoLiberacao" defaultValue={discovery.releaseYear}><option value="all">Todos</option>{releaseYears.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
           <label>Mês de liberação<select name="mesLiberacao" defaultValue={discovery.releaseMonth}><option value="all">Todos</option>{PRIVATE_FILE_DISCOVERY_MONTHS.map(month=><option key={month} value={month}>{month}</option>)}</select></label>
           <label>Disponibilidade do nome<select name="nome" defaultValue={discovery.namePresence}><option value="all">Todos</option><option value="named">Com nome</option><option value="unnamed">Sem nome</option></select></label>
           <label>Data de liberação<select name="estadoLiberacao" defaultValue={discovery.releaseState}><option value="all">Todas</option><option value="valid">Válida</option><option value="missing">Ausente</option><option value="invalid">Inválida</option></select></label>
             </div>
          </details>
          <label>Ordenação
            <select name="ordem" defaultValue={order.value}>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="largest">Maiores arquivos</option>
              <option value="smallest">Menores arquivos</option>
              <option value="kind">Por categoria</option>
              <option value="released">Disponibilizados mais recentemente</option><option value="released-oldest">Disponibilizados há mais tempo</option><option value="name-asc">Nome A–Z</option><option value="name-desc">Nome Z–A</option><option value="mime">Tipo MIME</option>
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link href="/cliente/arquivos">Limpar filtros</Link>
        </form>
        <p role="status">{filteredFiles.length} de {files.length} arquivo(s) disponível(is) · Fotos: {categories.photo}, exames: {categories.exam}, documentos: {categories.document}.</p>
      </Section>
      <div id="lista-arquivos" className={styles.historyAnchor}>
      {(invalidScopeFilter || discovery.invalid || metadata.invalid || displayPreview.invalid || order.invalid || requestedPage.invalid || visiblePage.outOfRange) ? (
        <p className={styles.filterNotice} role="status">O filtro ou a página solicitada não está disponível. Exibimos uma página válida dos seus arquivos autorizados.</p>
      ) : null}
      <Section
        action={<Badge variant="neutral">{filteredFiles.length} arquivo(s)</Badge>}
        description="Aqui aparecem os arquivos já validados e liberados para sua conta."
        title="Histórico"
      >
        {filteredFiles.length === 0 ? (
          <EmptyState
            description={files.length === 0 ? "Ainda não há arquivos disponíveis no histórico. Você pode enviar uma foto, um exame ou um documento pelo formulário acima." : "Nenhum arquivo corresponde aos filtros escolhidos. Limpe os filtros para consultar os demais arquivos."}
            title="Nenhum arquivo disponível"
            action={files.length === 0 ? <a href="#enviar-arquivo">Ir para envio</a> : <Link href="/cliente/arquivos">Limpar filtros</Link>}
          />
        ) : (
          <ul className={styles.fileList}>
            {visiblePage.items.map((file) => (
              <li id={`arquivo-historico-${file.id}`} key={file.id}>
                <Card className={styles.fileCard}>
                  <div className={styles.fileHeader}>
                    <h3 className={styles.fileTitle}>
                      {file.original_filename?.trim() ||
                        "Arquivo sem nome informado"}
                    </h3>
                    <div className={styles.fileBadges}>
                      <Badge variant="neutral">
                        {fileKindLabels[file.file_kind] ?? file.file_kind}
                      </Badge>
                      <Badge variant="neutral">
                        {privateFileOriginLabel(file, client.profile_id, "client")}
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
                      <dd>{formatPrivateFileSize(file.byte_size)}</dd>
                    </div>
                    <div>
                      <dt>Registrado em</dt>
                      <dd>{formatPrivateFileRecordedAt(file.created_at)}</dd>
                    </div>
                    {file.client_visible_at ? (
                      <div>
                        <dt>Disponível para você desde</dt>
                        <dd>{formatPrivateFileRecordedAt(file.client_visible_at)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className={styles.fileActions}>
                    <Link className={styles.downloadLink} href={`/cliente/arquivos?arquivo=${file.id}#arquivo-historico-${file.id}`}>Abrir registro no histórico</Link>
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
      {visiblePage.total > 0 ? (
        <nav aria-label="Páginas dos arquivos" className={styles.pagination}>
          <p>{visiblePage.first}–{visiblePage.last} de {visiblePage.total} arquivo(s) · Página {visiblePage.page} de {visiblePage.pageCount}</p>
          {visiblePage.previous ? <Link href={historyHref(visiblePage.previous)}>Anterior</Link> : null}
          {visiblePrivateFilePageNumbers(visiblePage.page, visiblePage.pageCount).map((number) =>
            number === visiblePage.page
              ? <strong key={number} aria-current="page">Página {number}</strong>
              : <Link key={number} href={historyHref(number)} aria-label={`Ir para página ${number}`}>{number}</Link>
          )}
          {visiblePage.next ? <Link href={historyHref(visiblePage.next)}>Próxima</Link> : null}
        </nav>
      ) : null}
      </div>
      <ClientJourneyNextSteps areas={["assessments","index"]} />
    </>
  );
}
