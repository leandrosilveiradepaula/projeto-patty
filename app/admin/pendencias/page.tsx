import { PENDING_AREA_OPTIONS, countPendingAreas } from "@/lib/operations/pending-area-filter";
import { readPendingExplorerQuery, explorePendingClientQueue, pendingExplorerGroupHref, pendingExplorerPageHref, paginatePendingQueue, pendingQueueYears, countPendingQueueClients, pendingQueueOldestDate, PENDING_EXPLORER_MONTHS } from "@/lib/operations/pending-explorer";
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

export default async function AdminPendenciasPage({ searchParams }: { searchParams: Promise<{ grupo?: string; q?: string; tipo?: string; area?: string; responsavel?: string; ordem?: string; ano?: string; mes?: string; dataInicial?: string; dataFinal?: string; integridadeData?: string; vinculo?: string; multiplas?: string; paginaPatty?: string; paginaCliente?: string; paginaSistema?: string }> }) {
  const rawQuery = await searchParams;
  const focusedGroup = parsePendingQueueFocus(rawQuery.grupo);
  const allItems = await getOperationalPendingItemsForCurrentAdmin();
  const kindOptions = [...new Map(allItems.map(item=>[item.kind,{kind:item.kind,label:item.title}])).values()]
    .sort((a,b)=>a.label.localeCompare(b.label,"pt-BR"));
  const years=pendingQueueYears(allItems);
  const filters = readPendingExplorerQuery(rawQuery,kindOptions.map(item=>item.kind),years);
  const items = explorePendingClientQueue(allItems,filters);
  const areaCounts=countPendingAreas(explorePendingClientQueue(allItems,{...filters,area:null}));
  const grouped = groupOperationalPendingItems(items);
  const pages={patty:paginatePendingQueue(grouped.patty,filters.pattyPage),client:paginatePendingQueue(grouped.client,filters.clientPage),operational:paginatePendingQueue(grouped.operational,filters.operationalPage)};
  const hasAdvancedFilters = filters.sort !== "oldest" || filters.year !== "all" ||
    filters.month !== "all" || Boolean(filters.fromDate || filters.toDate) ||
    filters.dateValidity !== "all" || filters.clientScope !== "all" ||
    filters.multiple !== "all";
  const sortDescriptions = {
    oldest: "Registros mais antigos primeiro dentro de cada grupo. A posição na fila não indica prioridade clínica.",
    newest: "Registros mais recentes primeiro dentro de cada grupo. A posição na fila não indica prioridade clínica.",
    "client-asc": "Pendências por nome da cliente, de A a Z, dentro de cada grupo. A posição não indica prioridade clínica.",
    "client-desc": "Pendências por nome da cliente, de Z a A, dentro de cada grupo. A posição não indica prioridade clínica.",
    type: "Pendências ordenadas pelo tipo de ação dentro de cada grupo. A posição não indica prioridade clínica.",
  }[filters.sort];

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
          <label>Área operacional
            <select name="area" defaultValue={filters.area??"all"}>
              <option value="all">Todas as áreas</option>
              {PENDING_AREA_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label} ({areaCounts.get(option.value)??0})</option>)}
            </select>
          </label>
          <label>Responsável pela próxima ação
            <select name="responsavel" defaultValue={filters.responsible}><option value="all">Todos</option><option value="patty">Patty</option><option value="client">Cliente</option><option value="operational">Sistema</option></select>
          </label>
          <details className={styles.advancedFilters} open={hasAdvancedFilters}>
            <summary>Filtros avançados{hasAdvancedFilters ? " (aplicados)" : ""}</summary>
            <div className={styles.advancedFiltersContent}>
          <label>Ordenação
            <select name="ordem" defaultValue={filters.sort}><option value="oldest">Mais antigas</option><option value="newest">Mais recentes</option><option value="client-asc">Cliente A–Z</option><option value="client-desc">Cliente Z–A</option><option value="type">Tipo de ação A–Z</option></select>
          </label>
          <label>Ano de registro
            <select name="ano" defaultValue={filters.year}><option value="all">Todos</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select>
          </label>
          <label>Mês de registro
            <select name="mes" defaultValue={filters.month}><option value="all">Todos</option>{PENDING_EXPLORER_MONTHS.map(month=><option key={month} value={month}>{month}</option>)}</select>
          </label>
          <label>Data inicial (inclusive)<input type="date" name="dataInicial" defaultValue={filters.fromDate??""}/></label>
          <label>Data final (inclusive)<input type="date" name="dataFinal" defaultValue={filters.toDate??""}/></label>
          <label>Integridade da data<select name="integridadeData" defaultValue={filters.dateValidity}><option value="all">Todas</option><option value="valid">Válidas</option><option value="invalid">Datas indisponíveis</option></select></label>
          <label>Vínculo cadastral<select name="vinculo" defaultValue={filters.clientScope}><option value="all">Todos</option><option value="client">Com cadastro de cliente</option><option value="system">Sem vínculo de cliente</option></select></label>
          <label>Várias pendências da mesma cliente<select name="multiplas" defaultValue={filters.multiple}><option value="all">Todas</option><option value="multiple">Com várias pendências</option><option value="single">Com uma pendência</option></select></label>
            </div>
          </details>
          <Button type="submit" variant="secondary">Filtrar</Button>
          {filters.query || filters.kind!=="all" || filters.area || filters.responsible!=="all" || filters.sort!=="oldest" || filters.year!=="all" || filters.month!=="all" || filters.fromDate || filters.toDate || filters.dateValidity!=="all" || filters.clientScope!=="all" || filters.multiple!=="all" ? <Link href="/admin/pendencias">Limpar</Link> : null}
        </form>
        <p role="status">Exibindo {items.length} de {allItems.length} pendência(s), referentes a {countPendingQueueClients(items)} cliente(s).{pendingQueueOldestDate(items) ? ` Registro válido mais antigo: ${formatDateTime(pendingQueueOldestDate(items)!)}` : ""}</p>
        {filters.invalid ? <Alert variant="info" title="Consulta ajustada">Um parâmetro inválido foi ignorado. Exibimos apenas pendências autorizadas.</Alert> : null}
      </Section>
      <Section
        description={sortDescriptions}
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
            description={allItems.length===0 ? "Nenhuma ação da Patty, espera de cliente ou pendência operacional consta nesta fila no momento." : "Nenhuma pendência corresponde aos filtros atuais. Você pode limpar os filtros para consultar a fila completa."}
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
                <PendingList group="patty" items={pages.patty.items} />
                  <nav aria-label="Páginas de patty" className={styles.groupNavigation}>
                    {pages.patty.page>1?<Link href={pendingExplorerPageHref("patty",filters,pages.patty.page-1)}>Anterior</Link>:null}
                    <span>Página {pages.patty.page} de {pages.patty.pageCount} · {pages.patty.from}–{pages.patty.to} de {pages.patty.total}</span>
                    {pages.patty.page<pages.patty.pageCount?<Link href={pendingExplorerPageHref("patty",filters,pages.patty.page+1)}>Próxima</Link>:null}
                  </nav>
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
                  <PendingList group="client" items={pages.client.items} />
                  <nav aria-label="Páginas de client" className={styles.groupNavigation}>
                    {pages.client.page>1?<Link href={pendingExplorerPageHref("client",filters,pages.client.page-1)}>Anterior</Link>:null}
                    <span>Página {pages.client.page} de {pages.client.pageCount} · {pages.client.from}–{pages.client.to} de {pages.client.total}</span>
                    {pages.client.page<pages.client.pageCount?<Link href={pendingExplorerPageHref("client",filters,pages.client.page+1)}>Próxima</Link>:null}
                  </nav>
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
                  <PendingList group="operational" items={pages.operational.items} />
                  <nav aria-label="Páginas de operational" className={styles.groupNavigation}>
                    {pages.operational.page>1?<Link href={pendingExplorerPageHref("operational",filters,pages.operational.page-1)}>Anterior</Link>:null}
                    <span>Página {pages.operational.page} de {pages.operational.pageCount} · {pages.operational.from}–{pages.operational.to} de {pages.operational.total}</span>
                    {pages.operational.page<pages.operational.pageCount?<Link href={pendingExplorerPageHref("operational",filters,pages.operational.page+1)}>Próxima</Link>:null}
                  </nav>
                </div>
              </details>
            ) : null}
          </div>
        )}
      </Section>
    </>
  );
}
