import { readPendingExplorerQuery, explorePendingClientQueue, pendingExplorerGroupHref } from "@/lib/operations/pending-explorer";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import { groupOperationalPendingItems } from "@/lib/operations/pending";
import { parsePendingQueueFocus } from "@/lib/operations/pending-navigation";
import Link from "next/link";

import styles from "./page.module.css";

import { formatPendingQueueDateTime } from "@/lib/operations/pending-date";

const formatDateTime = formatPendingQueueDateTime;

function PendingList({
  items,
  group,
}: {
  group: "patty" | "client" | "operational";
  items: Awaited<ReturnType<typeof getOperationalPendingItemsForCurrentAdmin>>;
}) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <PendingItemCard
            action={
              <div className={styles.actions}>
                <Link className={styles.actionLink} href={item.href}>
                  Abrir registro
                </Link>
                {item.clientId ? (
                  <Link
                    className={styles.clientLink}
                    href={`/admin/clientes/${item.clientId}`}
                  >
                    Ver cliente
                  </Link>
                ) : null}
              </div>
            }
            description={item.description}
            meta={`${item.clientLabel} · ${formatDateTime(item.createdAt)}`}
            status={<Badge variant={group === "client" ? "neutral" : "warning"}>{item.statusLabel}</Badge>}
            title={item.title}
          />
        </li>
      ))}
    </ol>
  );
}

export default async function AdminPendenciasPage({ searchParams }: { searchParams: Promise<{ grupo?: string; q?: string; tipo?: string }> }) {
  const rawQuery = await searchParams;
  const focusedGroup = parsePendingQueueFocus(rawQuery.grupo);
  const allItems = await getOperationalPendingItemsForCurrentAdmin();
  const kindOptions = [...new Map(allItems.map(item=>[item.kind,{kind:item.kind,label:item.title}])).values()]
    .sort((a,b)=>a.label.localeCompare(b.label,"pt-BR"));
  const filters = readPendingExplorerQuery(rawQuery,kindOptions.map(item=>item.kind));
  const items = explorePendingClientQueue(allItems,filters);
  const grouped = groupOperationalPendingItems(items);

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">{items.length} pendência(s)</Badge>}
        description="Acompanhe ações da Patty, registros aguardando a cliente e pendências técnicas separadamente. Estar na fila não significa prioridade clínica."
        eyebrow="Admin"
        title="Pendências operacionais"
      />

      <Section title="Localizar pendências" description="Busque por cliente ou tipo já registrado. A pesquisa não muda prioridade nem autorização.">
        <form action="/admin/pendencias" method="get" className={styles.explorerFilters}>
          <label>Cliente
            <input name="q" type="search" maxLength={120} placeholder="Nome da cliente" defaultValue={filters.query}/>
          </label>
          <label>Tipo de pendência
            <select name="tipo" defaultValue={filters.kind}>
              <option value="all">Todos os tipos</option>
              {kindOptions.map(option=><option key={option.kind} value={option.kind}>{option.label}</option>)}
            </select>
          </label>
          {focusedGroup ? <input type="hidden" name="grupo" value={focusedGroup}/> : null}
          <Button type="submit" variant="secondary">Filtrar</Button>
          {filters.query || filters.kind!=="all" ? <Link href="/admin/pendencias">Limpar</Link> : null}
        </form>
        <p role="status">Exibindo {items.length} de {allItems.length} pendência(s).</p>
        {filters.invalid ? <Alert variant="info" title="Consulta ajustada">Um parâmetro inválido foi ignorado. Exibimos apenas pendências autorizadas.</Alert> : null}
      </Section>
      <Section
        description="As pendências continuam ordenadas por antiguidade dentro de cada grupo, mas agora ficam separadas pelo tipo de ação necessária."
        title="Registros que exigem acompanhamento"
      >
        {items.length > 0 ? (
          <nav aria-label="Ir para grupo de pendências" className={styles.groupNavigation}>
            {grouped.patty.length > 0 ? (
              <Link aria-current={focusedGroup === "patty" ? "location" : undefined} href={pendingExplorerGroupHref("patty",filters)}>
                Ação da Patty ({grouped.patty.length})
              </Link>
            ) : <span>Ação da Patty (0)</span>}
            {grouped.client.length > 0 ? (
              <Link aria-current={focusedGroup === "client" ? "location" : undefined} href={pendingExplorerGroupHref("client",filters)}>
                Aguardando cliente ({grouped.client.length})
              </Link>
            ) : <span>Aguardando cliente (0)</span>}
            {grouped.operational.length > 0 ? (
              <Link aria-current={focusedGroup === "operational" ? "location" : undefined} href={pendingExplorerGroupHref("operational",filters)}>
                Operacional do sistema ({grouped.operational.length})
              </Link>
            ) : <span>Operacional do sistema (0)</span>}
          </nav>
        ) : null}
        {items.length === 0 ? (
          <EmptyState
            description={allItems.length===0 ? "Nenhuma ação da Patty, espera de cliente ou pendência operacional consta nesta fila no momento." : "Nenhuma pendência corresponde aos filtros atuais."}
            title={allItems.length===0 ? "Tudo em dia" : "Nenhum resultado"}
          />
        ) : (
          <div className={styles.groups}>
            {focusedGroup && grouped[focusedGroup].length === 0 ? (
              <div className={styles.focusedEmpty} role="status">
                {focusedGroup === "patty"
                  ? "Nenhuma ação da Patty registrada nesta fila no momento."
                  : focusedGroup === "client"
                    ? "Nenhuma pendência aguardando cliente nesta fila no momento."
                    : "Nenhuma pendência operacional do sistema nesta fila no momento."}
                <Link className={styles.clientLink} href="/admin/pendencias">Ver toda a fila</Link>
              </div>
            ) : null}
            {grouped.patty.length > 0 ? (
              <section className={styles.group} id="acao-da-patty">
                <div className={styles.groupHeader}>
                  <div>
                    <h3>Ação da Patty</h3>
                    <p>Itens em que a próxima ação disponível é da Patty.</p>
                  </div>
                  <Badge variant="warning">{grouped.patty.length}</Badge>
                </div>
                <PendingList group="patty" items={grouped.patty} />
              </section>
            ) : null}

            {grouped.client.length > 0 ? (
              <details className={styles.collapsibleGroup} id="aguardando-cliente" open={focusedGroup === "client"}>
                <summary className={styles.groupSummary}>
                  <span>
                    <strong>Aguardando cliente</strong>
                    <small>Itens abertos que dependem principalmente de resposta ou preenchimento da cliente.</small>
                  </span>
                  <Badge variant="neutral">{grouped.client.length}</Badge>
                </summary>
                <div className={styles.collapsibleContent}>
                  <PendingList group="client" items={grouped.client} />
                </div>
              </details>
            ) : null}

            {grouped.operational.length > 0 ? (
              <details className={styles.collapsibleGroup} id="operacional-do-sistema" open={focusedGroup === "operational"}>
                <summary className={styles.groupSummary}>
                  <span>
                    <strong>Operacional do sistema</strong>
                    <small>Falhas de envio ou execuções técnicas que precisam de acompanhamento operacional.</small>
                  </span>
                  <Badge variant="warning">{grouped.operational.length}</Badge>
                </summary>
                <div className={styles.collapsibleContent}>
                  <PendingList group="operational" items={grouped.operational} />
                </div>
              </details>
            ) : null}
          </div>
        )}
      </Section>
    </>
  );
}
