import { readPrivateFileDiscovery, matchesPrivateFileDiscovery, privateFileReleaseYears, PRIVATE_FILE_DISCOVERY_MONTHS } from "@/lib/files/private-file-discovery";
import { availablePrivateFileYears, matchesPrivateFileMetadata, readPrivateFileMetadataFilters, type PrivateFileMetadataFilters } from "@/lib/files/private-file-metadata-filters";
import type { PrivateFileViewFilter } from "@/lib/files/private-file-history-view";
import { authorizedExactRecordPage } from "@/lib/operations/exact-record-navigation";
import { PrivatePhotoComparison } from "@/components/files/PrivatePhotoComparison";
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
import { matchesPrivateFilePreviewFilter, paginatePrivateFileHistory, privateFileHistoryHref, readPrivateFileHistoryPage, readPrivateFileHistorySort, readPrivateFilePreviewFilter, sortPrivateFileHistory, countPrivateFileCategories, visiblePrivateFilePageNumbers, privateFileHistoryCounts } from "@/lib/files/private-file-history-workspace";

type AdminClientFilesPageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ categoria?: string; origem?: string; formato?: string; visualizacao?: string; ordem?: string; paginaPendentes?: string; paginaHistorico?: string; fotoAntes?: string; fotoDepois?: string; arquivoPendente?: string; arquivoHistorico?: string; ano?: string; tamanho?: string; mes?: string; dataInicial?: string; dataFinal?: string; minKb?: string; maxKb?: string; grupoMime?: string; integridadeData?: string; anoLiberacao?: string; mesLiberacao?: string; nome?: string; estadoLiberacao?: string }>;
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
  // Resolve opaque IDs only inside files already returned for this professional and client.
  const pendingTarget = typeof filters.arquivoPendente === "string" && files.some(file =>
    file.id === filters.arquivoPendente && isPrivateFilePendingProfessionalRelease(file,client.profile_id));
  const historyTarget = !pendingTarget && typeof filters.arquivoHistorico === "string" && files.some(file =>
    file.id === filters.arquivoHistorico && !isPrivateFilePendingProfessionalRelease(file,client.profile_id));
  const hasExactTarget = pendingTarget || historyTarget;
  const years=availablePrivateFileYears(files);
  const releaseYears=privateFileReleaseYears(files);
  const discovery=readPrivateFileDiscovery(hasExactTarget ? {} : filters,releaseYears);
  const metadata:PrivateFileMetadataFilters=hasExactTarget
    ? {year:"all",size:"all",invalid:false}
    : readPrivateFileMetadataFilters({ano:filters.ano,tamanho:filters.tamanho},years);
  const kind=readPrivateFileKindFilter(hasExactTarget?undefined:filters.categoria);
  const origin=readPrivateFileOriginFilter(hasExactTarget?undefined:filters.origem);
  const preview=readPrivateFilePreviewFilter(hasExactTarget?undefined:filters.formato);
  const view:PrivateFileViewFilter = pendingTarget ? "pending" : historyTarget ? "history" : readPrivateFileViewFilter(filters.visualizacao);
  const order=readPrivateFileHistorySort(hasExactTarget?undefined:filters.ordem);
  const requestedPending = readPrivateFileHistoryPage(filters.paginaPendentes);
  const requestedHistory = readPrivateFileHistoryPage(filters.paginaHistorico);
  const counts = privateFileHistoryCounts(files, client.profile_id);
  const kinds = countPrivateFileCategories(files);
  const basePath = `/admin/clientes/${client.id}/arquivos`;
  const navigate = (target: "pending" | "history", page: number) => privateFileHistoryHref(basePath, {
    categoria: kind, origem: origin, formato: preview.value, visualizacao: view, ordem: order.value, ano: metadata.year, tamanho:metadata.size, mes:discovery.month,dataInicial:discovery.fromDate,dataFinal:discovery.toDate,minKb:discovery.minKb,maxKb:discovery.maxKb,grupoMime:discovery.mimeFamily,integridadeData:discovery.recordedValidity,anoLiberacao:discovery.releaseYear,mesLiberacao:discovery.releaseMonth,nome:discovery.namePresence,estadoLiberacao:discovery.releaseState,
    paginaPendentes: target === "pending" ? page : pendingPage.page,
    paginaHistorico: target === "history" ? page : historyPage.page,
    anchor: target === "pending" ? "aguardando-liberacao" : "historico-arquivos",
  });
  const filteredFiles = files.filter(file => matchesPrivateFileFilters(file, client.profile_id, kind, origin)
    && matchesPrivateFilePreviewFilter(file.mime_type, preview.value)
    && matchesPrivateFileMetadata(file,metadata)
    && matchesPrivateFileDiscovery(file,discovery));
  const pendingReleaseFiles = filteredFiles.filter(file => isPrivateFilePendingProfessionalRelease(file, client.profile_id));
  const historyFiles = filteredFiles.filter(file => !isPrivateFilePendingProfessionalRelease(file, client.profile_id));
  const totalPending = counts.pending;
  const hasFilteredOutPending = totalPending > 0 && pendingReleaseFiles.length === 0;
  const sortedPending = sortPrivateFileHistory(pendingReleaseFiles, order.value);
  const exactPendingPage = authorizedExactRecordPage(sortedPending, filters.arquivoPendente, 12);
  const pendingPage = paginatePrivateFileHistory(sortedPending, exactPendingPage ?? requestedPending.page);
  const sortedHistory=sortPrivateFileHistory(historyFiles,order.value);
  const exactHistoryPage=authorizedExactRecordPage(sortedHistory,filters.arquivoHistorico,12);
  const historyPage=paginatePrivateFileHistory(sortedHistory,exactHistoryPage??requestedHistory.page);

  return (
    <>
      <ClientWorkspaceHeader
        meta="Privacidade e liberação de arquivos"
        displayName={displayName}
        secondary="Fotos, exames e documentos privados"
        status={<Badge variant="neutral">{files.length} arquivo(s)</Badge>}
      />
      <ClientWorkspaceNav activeArea="arquivos" clientId={client.id} />
      <PrivatePhotoComparison files={files} clientId={client.id} before={filters.fotoAntes} after={filters.fotoDepois} path={`/admin/clientes/${client.id}/arquivos`} fileRoute="/admin/arquivos" returnHref={privateFileHistoryHref(`/admin/clientes/${client.id}/arquivos`,{categoria:readPrivateFileKindFilter(filters.categoria),origem:readPrivateFileOriginFilter(filters.origem),formato:readPrivateFilePreviewFilter(filters.formato).value,visualizacao:readPrivateFileViewFilter(filters.visualizacao),ordem:readPrivateFileHistorySort(filters.ordem).value})} />
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
          <label>Disponibilidade
            <select name="formato" defaultValue={preview.value}>
              <option value="all">Todos os formatos</option>
              <option value="previewable">Com prévia compatível</option>
              <option value="download_only">Apenas download</option>
            </select>
          </label>
          <label>Exibição
            <select name="visualizacao" defaultValue={view}>
              <option value="all">Tudo</option><option value="pending">Aguardando liberação</option><option value="history">Histórico</option>
            </select>
          </label>
          <label>Ano de registro
            <select name="ano" defaultValue={metadata.year}>
              <option value="all">Todos os anos</option>
              {years.map(year=><option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>Metadados de tamanho
            <select name="tamanho" defaultValue={metadata.size}>
              <option value="all">Todos</option><option value="known">Tamanho registrado</option><option value="unknown">Tamanho ausente</option>
            </select>
          </label>
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
          <Link href={`/admin/clientes/${client.id}/arquivos`}>Limpar filtros</Link>
        </form>
        <p role="status">{filteredFiles.length} de {counts.all} arquivo(s) · {totalPending} aguardando liberação no total. Fotos: {kinds.photo}, exames: {kinds.exam}, documentos: {kinds.document}. Enviados pela cliente: {counts.client}; equipe ou autoria desconhecida: {counts.team}.</p>
        {(discovery.invalid || metadata.invalid || preview.invalid || order.invalid || requestedPending.invalid || requestedHistory.invalid || pendingPage.outOfRange || historyPage.outOfRange) ? (
          <p className={styles.filterNotice} role="status">Um filtro de ordenação ou página não é válido. Exibimos somente registros autorizados em uma página disponível.</p>
        ) : null}
      </Section>
      {view !== "history" ? <div id="aguardando-liberacao">
        <Section
          action={<Badge variant={pendingReleaseFiles.length > 0 ? "warning" : "neutral"}>{pendingReleaseFiles.length} pendente(s)</Badge>}
          description="Arquivos administrativos ainda ocultos para a cliente. Revise cada arquivo antes de decidir se deve liberá-lo."
          title="Aguardando liberação"
        >
          {pendingReleaseFiles.length === 0 ? (
            <EmptyState
              description={totalPending > 0 ? "Existem arquivos aguardando liberação, mas nenhum corresponde aos filtros selecionados. Limpe os filtros para revisar as pendências." : "Nenhum upload administrativo está aguardando liberação nesta cliente."}
              title="Sem arquivos pendentes"
              action={hasFilteredOutPending ? <Link href={`${basePath}#aguardando-liberacao`}>Limpar filtros e revisar pendências</Link> : undefined}
            />
          ) : (
          <ul className={styles.fileList}>
            {pendingPage.items.map((file: (typeof files)[number]) => (
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
                    {file.client_visible_at ? <div><dt>Liberado em</dt><dd>{formatPrivateFileRecordedAt(file.client_visible_at)}</dd></div> : null}
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
          {pendingPage.total > 0 ? (
            <nav aria-label="Páginas aguardando liberação" className={styles.pagination}>
              <p>{pendingPage.first}–{pendingPage.last} de {pendingPage.total} pendente(s) · Página {pendingPage.page} de {pendingPage.pageCount}</p>
              {pendingPage.previous ? <Link href={navigate("pending", pendingPage.previous)}>Anterior</Link> : null}
              {visiblePrivateFilePageNumbers(pendingPage.page, pendingPage.pageCount).map((number) =>
                number === pendingPage.page ? <strong aria-current="page" key={number}>Página {number}</strong> :
                <Link key={number} href={navigate("pending", number)} aria-label={`Ir para página ${number} dos pendentes`}>{number}</Link>
              )}
              {pendingPage.next ? <Link href={navigate("pending", pendingPage.next)}>Próxima</Link> : null}
            </nav>
          ) : null}
        </Section>
      </div> : null}

      {view !== "pending" ? <div id="historico-arquivos" className={styles.historyAnchor}><Section
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
            {historyPage.items.map((file: (typeof files)[number]) => (
              <li id={`arquivo-historico-${file.id}`} key={file.id}>
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
                    {file.client_visible_at ? <div><dt>Liberado em</dt><dd>{formatPrivateFileRecordedAt(file.client_visible_at)}</dd></div> : null}
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
                    <Link className={styles.downloadLink} href={`${basePath}?arquivoHistorico=${file.id}#arquivo-historico-${file.id}`}>Abrir registro no histórico</Link>
                    {!file.client_visible_at && file.uploaded_by_profile_id !== client.profile_id ? (
                      <AdminPrivateFileReleaseForm clientId={client.id} fileId={file.id} fileName={file.original_filename?.trim() || "Arquivo sem nome informado"} />
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {historyPage.total > 0 ? (
          <nav aria-label="Páginas do histórico privado" className={styles.pagination}>
            <p>{historyPage.first}–{historyPage.last} de {historyPage.total} arquivo(s) · Página {historyPage.page} de {historyPage.pageCount}</p>
            {historyPage.previous ? <Link href={navigate("history", historyPage.previous)}>Anterior</Link> : null}
            {visiblePrivateFilePageNumbers(historyPage.page, historyPage.pageCount).map((number) =>
              number === historyPage.page ? <strong aria-current="page" key={number}>Página {number}</strong> :
              <Link key={number} href={navigate("history", number)} aria-label={`Ir para página ${number} do histórico`}>{number}</Link>
            )}
            {historyPage.next ? <Link href={navigate("history", historyPage.next)}>Próxima</Link> : null}
          </nav>
        ) : null}
      </Section></div> : null}
    </>
  );
}
