import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  protocolCatalogClientName, protocolTypeLabel, readProtocolCatalogStatus,
  readProtocolCatalogTerm, selectProtocolCatalog,
} from "@/lib/protocol/admin-catalog-ux";
import {
  listAccessibleProtocols, listAccessibleProtocolVersionsForProtocols,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminProtocolosPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const query = readProtocolCatalogTerm(q);
  const filter = readProtocolCatalogStatus(status);
  const protocols = await listAccessibleProtocols();
  const versions = await listAccessibleProtocolVersionsForProtocols(protocols.map((p) => p.id));
  const versionedIds = new Set(versions.map((v) => v.protocol_id));
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
            <select defaultValue={filter} name="status">
              <option value="all">Todos</option>
              <option value="with-version">Com versão inicial</option>
              <option value="needs-recovery">Precisam de recuperação</option>
            </select>
          </label>
          <button className={styles.filterButton} type="submit">Aplicar filtros</button>
          <Link className={styles.actionLink} href="/admin/protocolos">Limpar filtros</Link>
        </form>
        <p className={styles.resultCount} role="status">
          {filtered.length} de {protocols.length} protocolos
          {incomplete ? ` · ${incomplete} sem versão inicial` : ""}
        </p>
        {protocols.length === 0 ? (
          <EmptyState
            action={<Link className={styles.actionLink} href="/admin/clientes">Escolher cliente</Link>}
            description="Escolha uma cliente para criar ou consultar um protocolo."
            title="Ainda não há protocolos"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            action={<Link className={styles.actionLink} href="/admin/protocolos">Limpar filtros</Link>}
            description="Nenhum protocolo corresponde aos filtros. Os registros continuam preservados."
            title="Nenhum resultado"
          />
        ) : (
          <ul className={styles.protocolList}>
            {filtered.map((protocol) => {
              const hasVersion = versionedIds.has(protocol.id);
              const clientName = protocolCatalogClientName(protocol);
              return (
                <li className={styles.protocolItem} key={protocol.id}>
                  <div>
                    <p className={styles.clientLabel}>{clientName}</p>
                    <dl className={styles.details}>
                      <div><dt>Tipo</dt><dd>{protocolTypeLabel(protocol.protocol_type)}</dd></div>
                      <div><dt>Versão</dt><dd>{hasVersion ? "Histórico disponível" : "Versão inicial pendente"}</dd></div>
                    </dl>
                  </div>
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
      </Section>
    </>
  );
}
