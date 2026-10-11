import { buildProtocolOperationalSummaries, exploreOperationalProtocolCatalog, readOperationalProtocolFilters, operationalProtocolCatalogHref, protocolOperationalStatusLabel, protocolPublicationDate } from "@/lib/protocol/operational-catalog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  protocolCatalogClientName, protocolTypeLabel, readProtocolCatalogStatus,
  readProtocolCatalogTerm, selectProtocolCatalog,
} from "@/lib/protocol/admin-catalog-ux";
import {
  listAccessibleProtocols, listAccessibleProtocolVersionsForProtocols,
  listAccessibleProtocolVersionApprovals, listAccessibleProtocolPublications,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; tipo?: string; ordem?: string; pagina?: string }>;
};

export default async function AdminProtocolosPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const { q, status } = queryParams;
  const operationalFilters = readOperationalProtocolFilters(queryParams);
  const query = readProtocolCatalogTerm(q);
  const filter = readProtocolCatalogStatus(status);
  const protocols = await listAccessibleProtocols();
  const versions = await listAccessibleProtocolVersionsForProtocols(protocols.map((p) => p.id));
  const versionedIds = new Set(versions.map((v) => v.protocol_id));
  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals(versions.map(v => v.id)),
    listAccessibleProtocolPublications(versions.map(v => v.id)),
  ]);
  const summaries = buildProtocolOperationalSummaries(protocols.map(p => p.id),versions,approvals,publications);
  const catalog = exploreOperationalProtocolCatalog(protocols,summaries,operationalFilters,protocolCatalogClientName);
  const filtered = selectProtocolCatalog(protocols, versionedIds, query, filter);
  const incomplete = protocols.filter((p) => !versionedIds.has(p.id)).length;

  return (
    <>
      <PageHeader description="Localize clientes, consulte versões e retome registros incompletos sem publicar automaticamente." eyebrow="Admin" title="Protocolos" />
      <Section description="Busque pelo nome da cliente. Protocolos sem versão inicial precisam ser retomados antes de entrar no editor." title="Protocolos registrados">
        <form action="/admin/protocolos" className={styles.filters} method="get">
          <label className={styles.filterField}>
            <span>Nome da cliente</span>
            <input defaultValue={query} maxLength={120} name="q" placeholder="Buscar cliente" type="search" />
          </label>
          <label className={styles.filterField}>
            <span>Situação</span>
            <select defaultValue={operationalFilters.status} name="status">
              <option value="all">Todos</option>
              <option value="with-version">Com versão inicial</option>
              <option value="needs-recovery">Precisam de recuperação</option>
              <option value="latest-draft">Versão em rascunho</option>
              <option value="under-review">Aguardando revisão</option>
              <option value="awaiting-publication">Aprovados, sem publicação</option>
              <option value="latest-published">Versão atual publicada</option>
              <option value="published-with-newer-version">Publicado com nova versão pendente</option>
              <option value="never-published">Nunca publicados</option>
            </select>
          </label>
          <label className={styles.filterField}><span>Tipo</span><select name="tipo" defaultValue={operationalFilters.type}>
            <option value="all">Todos os tipos</option><option value="nutrition">Nutricional</option><option value="other">Outros registrados</option>
          </select></label>
          <label className={styles.filterField}><span>Ordenação</span><select name="ordem" defaultValue={operationalFilters.sort}>
            <option value="name">Nome da cliente</option><option value="newest">Criação recente</option>
            <option value="oldest">Criação antiga</option><option value="latest-version">Maior versão</option>
            <option value="recent-publication">Última publicação</option>
          </select></label>
          <button className={styles.filterButton} type="submit">Aplicar filtros</button>
          <Link className={styles.actionLink} href="/admin/protocolos">Limpar filtros</Link>
        </form>
        <p className={styles.resultCount} role="status">
          {catalog.total} de {protocols.length} protocolos
          {incomplete ? ` · ${incomplete} sem versão inicial` : ""}
        </p>
        <p className={styles.resultCount}>Sem versão: {catalog.counts.needsRecovery} · Rascunhos: {catalog.counts.latestDraft} · Revisão: {catalog.counts.underReview} · Aprovados sem publicação: {catalog.counts.awaitingPublication} · Última versão publicada: {catalog.counts.latestPublished} · Publicado com versão pendente: {catalog.counts.newerUnpublished}</p>
        {catalog.invalidPage ? <p role="status">Página indisponível. Exibindo uma página válida.</p> : null}
        {protocols.length === 0 ? (
          <EmptyState
            action={<Link className={styles.actionLink} href="/admin/clientes">Escolher cliente</Link>}
            description="Escolha uma cliente para criar ou consultar um protocolo."
            title="Ainda não há protocolos"
          />
        ) : catalog.total === 0 ? (
          <EmptyState
            action={<Link className={styles.actionLink} href="/admin/protocolos">Limpar filtros</Link>}
            description="Nenhum protocolo corresponde aos filtros. Os registros continuam preservados."
            title="Nenhum resultado"
          />
        ) : (
          <ul className={styles.protocolList}>
            {catalog.items.map((protocol) => {
              const hasVersion = versionedIds.has(protocol.id);
              const clientName = protocolCatalogClientName(protocol);
              const facts = summaries.get(protocol.id);
              return (
                <li className={styles.protocolItem} key={protocol.id}>
                  <div>
                    <p className={styles.clientLabel}>{clientName}</p>
                    <dl className={styles.details}>
                      <div><dt>Tipo</dt><dd>{protocolTypeLabel(protocol.protocol_type)}</dd></div>
                      <div><dt>Versão</dt><dd>{hasVersion ? "Versão " + (facts?.latestVersion?.version_number ?? "indisponível") : "Versão inicial pendente"}</dd></div>
                      <div><dt>Situação</dt><dd>{facts ? protocolOperationalStatusLabel(facts.latestStatus) : "Indisponível"}</dd></div>
                      <div><dt>Publicações</dt><dd>{facts?.publicationCount ?? 0}</dd></div>
                      {facts?.lastPublishedVersion ? <div><dt>Última publicação</dt><dd>{protocolPublicationDate(facts.lastPublishedAt)} · versão {facts.lastPublishedVersion.version_number}</dd></div> : null}
                    </dl>
                  </div>
                  {facts?.hasUnpublishedNewerVersion ? <p className={styles.resultCount}>Há versão mais recente não publicada. A cliente continua recebendo apenas o protocolo publicado.</p> : null}
                  {hasVersion ? (
                    <Link aria-label={`Ver histórico do protocolo de ${clientName}`} className={styles.actionLink} href={`/admin/protocolos/${protocol.id}`}>
                      Ver histórico
                    </Link>
                  ) : (
                    <Link aria-label={`Retomar versão inicial para ${clientName}`} className={styles.actionLink} href={`/admin/clientes/${protocol.client_id}/protocolos?recuperacao=necessaria#protocolo-${protocol.id}`}>
                      Retomar versão inicial
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {catalog.total > 0 ? <nav aria-label="Páginas do catálogo de protocolos" className={styles.pages}>
          <span>{catalog.from}–{catalog.to} de {catalog.total} · Página {catalog.page} de {catalog.pages}</span>
          {catalog.previous ? <Link href={operationalProtocolCatalogHref("/admin/protocolos",operationalFilters,catalog.previous)}>Anterior</Link> : null}
          {catalog.next ? <Link href={operationalProtocolCatalogHref("/admin/protocolos",operationalFilters,catalog.next)}>Próxima</Link> : null}
        </nav> : null}
      </Section>
    </>
  );
}
