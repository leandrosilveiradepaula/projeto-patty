import { readClientDirectoryPage, paginateClientDirectory, clientDirectoryPageHref, visibleClientDirectoryPages } from "@/lib/clients/client-directory-pagination";
import { ClientListItem } from "@/components/admin/ClientListItem";
import { matchesClientDirectoryName, readClientDirectorySearchTerm } from "@/lib/clients/client-directory-search";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextInput } from "@/components/ui/TextInput";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import { readClientDirectoryPendingView, matchesClientDirectoryPendingView, countClientDirectoryPendingViews, CLIENT_DIRECTORY_PENDING_VIEW_LABELS } from "@/lib/operations/client-directory-pending-view";
import { withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { summarizeClientPendingItems, describeClientPendingSummary } from "@/lib/operations/client-pending-summary";
import { listClientsAssignedToCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function getInitials(displayName: string | null | undefined) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?";
}

type AdminClientesPageProps = {
  searchParams: Promise<{
    assignment?: string;
    onboarding?: string;
    q?: string;
    view?: string;
    pagina?: string;
  }>;
};

export default async function AdminClientesPage({
  searchParams,
}: AdminClientesPageProps) {
  const { assignment, onboarding, q, view, pagina } = await searchParams;
  const [assignments, pendingItems] = await Promise.all([
    listClientsAssignedToCurrentAdmin(),
    getOperationalPendingItemsForCurrentAdmin(),
  ]);
  const clients = (
    assignments?.flatMap((assignment) =>
      assignment.clients ? [assignment.clients] : [],
    ) ?? []
  ).sort((left, right) => {
    const leftName = left.full_name?.trim() || left.profiles?.display_name?.trim();
    const rightName = right.full_name?.trim() || right.profiles?.display_name?.trim();

    if (!leftName && !rightName) return left.id.localeCompare(right.id);
    if (!leftName) return 1;
    if (!rightName) return -1;

    return leftName.localeCompare(rightName, "pt-BR", {
      sensitivity: "base",
    });
  });
  const pendingByClientId = summarizeClientPendingItems(pendingItems);
  const clientsWithPattyActions = clients.filter(client => (pendingByClientId.get(client.id)?.patty.length ?? 0) > 0).length;
  const actionablePattyItems = clients.reduce((count, client) => count + (pendingByClientId.get(client.id)?.patty.length ?? 0), 0);
  const searchTerm = readClientDirectorySearchTerm(q);
  const viewFilter = readClientDirectoryPendingView(view);
  const requestedPage = readClientDirectoryPage(pagina);
  const directoryReturn = { q: searchTerm, view: viewFilter, page: requestedPage.page };
  const nameMatchedClients = clients.filter((client) => matchesClientDirectoryName(
    searchTerm, client.full_name, client.profiles?.display_name,
  ));
  const viewCounts = countClientDirectoryPendingViews(nameMatchedClients.map(client=>client.id),pendingByClientId);
  const filteredClients = nameMatchedClients.filter((client) =>
    matchesClientDirectoryPendingView(pendingByClientId.get(client.id),viewFilter)
  );

  const pagedClients = paginateClientDirectory(filteredClients, requestedPage.page);
  directoryReturn.page = pagedClients.page;
  const visiblePendingItems = filteredClients.reduce((count, client) => count + (pendingByClientId.get(client.id)?.total ?? 0), 0);
  const visiblePattyActions = filteredClients.reduce((count, client) => count + (pendingByClientId.get(client.id)?.patty.length ?? 0), 0);

  return (
    <>
      <PageHeader
        description="Gerencie os acompanhamentos, encontre registros e acompanhe as próximas ações em um só lugar."
        eyebrow="Admin"
        title="Clientes"
        primaryAction={<Link className={styles.primaryActionLink} href="/admin/clientes/nova">+ Convidar cliente</Link>}
      />
      {onboarding === "invited" ? (
        <Alert live="polite" title="Solicitação de convite registrada" variant="success">
          A conta inicial da cliente foi criada e o Supabase aceitou a solicitação de envio do convite. A entrega do email e a ativação ainda não foram verificadas.
        </Alert>
      ) : assignment === "ended" ? (
        <Alert live="polite" title="Acompanhamento encerrado" variant="success">
          A cliente agora está inativa. O acompanhamento atual foi encerrado e todo o histórico foi preservado.
        </Alert>
      ) : assignment === "unavailable" ? (
        <Alert live="assertive" title="Acompanhamento indisponível" variant="warning">
          Não havia um acompanhamento ativo para encerrar.
        </Alert>
      ) : assignment === "invalid" ? (
        <Alert live="assertive" title="Cliente inválida" variant="critical">
          Não foi possível identificar a cliente informada.
        </Alert>
      ) : null}

      <Section
        action={
          <Link className={styles.actionLink} href="/admin/clientes/nova">
            Convidar cliente
          </Link>
        }
        description="Consulte quem precisa de atenção, acompanhe respostas e encontre rapidamente cada cliente."
        title="Em acompanhamento"
      >
        <div className={styles.queueSummary}>
          <p role="status"><strong>{clientsWithPattyActions} cliente(s)</strong> com {actionablePattyItems} ação(ões) para revisão nos acompanhamentos autorizados.</p>
          <Link className={styles.queueLink} href={withClientDirectoryReturn("/admin/pendencias?responsavel=patty",directoryReturn)}>Abrir fila de ações para revisão</Link>
        </div>
        <form action="/admin/clientes" className={styles.searchForm} method="get">
          <label className={styles.searchLabel} htmlFor="client-search">
            Buscar cliente
          </label>
          <div className={styles.searchRow}>
            <TextInput
              defaultValue={searchTerm}
              id="client-search"
              name="q"
              maxLength={120}
              placeholder="Digite o nome da cliente"
              type="search"
            />
            <select
              aria-label="Filtrar clientes"
              className={styles.viewFilter}
              defaultValue={viewFilter}
              name="view"
            >
              {(Object.keys(CLIENT_DIRECTORY_PENDING_VIEW_LABELS) as Array<keyof typeof CLIENT_DIRECTORY_PENDING_VIEW_LABELS>).map(key=><option key={key} value={key}>{CLIENT_DIRECTORY_PENDING_VIEW_LABELS[key]} ({viewCounts[key]})</option>)}
            </select>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {searchTerm || viewFilter !== "all" ? (
              <Link className={styles.clearLink} href="/admin/clientes">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        {clients.length === 0 ? (
          <p className={styles.emptyMessage}>Nenhuma cliente está em acompanhamento no momento.</p>
        ) : filteredClients.length === 0 ? (
          <div className={styles.emptyMessage}>
            <p role="status">{viewFilter !== "all" ? `Nenhuma cliente no grupo “${CLIENT_DIRECTORY_PENDING_VIEW_LABELS[viewFilter]}” corresponde aos filtros atuais.` : `Nenhuma cliente corresponde à busca por “${searchTerm}”.`}</p>
            <Link className={styles.clearLink} href="/admin/clientes">Limpar filtros</Link>
          </div>
        ) : (
          <>
            {searchTerm || viewFilter !== "all" ? (
              <p className={styles.resultCount}>
                {filteredClients.length} de {clients.length} cliente(s) nos resultados filtrados · {visiblePendingItems} pendência(s) nesses resultados, incluindo {visiblePattyActions} ação(ões) para revisão.
              </p>
            ) : null}
            {requestedPage.invalid || pagedClients.adjusted ? <p role="status" className={styles.resultCount}>Página solicitada indisponível. Exibindo a página {pagedClients.page} de {pagedClients.pageCount}.</p> : null}
            <p className={styles.resultCount} role="status">Exibindo clientes {pagedClients.first}–{pagedClients.last} de {pagedClients.total} resultado(s).</p>
            <ul className={styles.clientList}>
            {pagedClients.items.map((client) => {
              const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
              const pendingSummary = pendingByClientId.get(client.id);
              const clientPattyPendingItems = pendingSummary?.patty ?? [];
              const nextPattyPending = clientPattyPendingItems[0] ?? null;
              const secondPattyPending = clientPattyPendingItems.find(
                (item) => item.href !== nextPattyPending?.href,
              ) ?? null;

              return (
                <li key={client.id}>
                  <ClientListItem
                    action={
                      <div className={styles.itemActions}>
                        {nextPattyPending ? (
                          <Link
                            aria-label={`Abrir ${nextPattyPending.title.toLocaleLowerCase("pt-BR")} de ${displayName || "registro legado sem nome"}`}
                            className={styles.actionLink}
                            href={withClientDirectoryReturn(nextPattyPending.href,directoryReturn)}
                          >
                            {nextPattyPending.title}
                          </Link>
                        ) : null}
                        {secondPattyPending || pendingSummary?.waiting || pendingSummary?.operational ? <details className={styles.moreActions}><summary>Outras opções</summary><div className={styles.moreActionsContent}>
                        {secondPattyPending ? (
                          <Link
                            aria-label={`Abrir outra ação: ${secondPattyPending.title.toLocaleLowerCase("pt-BR")} de ${displayName || "registro legado sem nome"}`}
                            className={styles.secondaryActionLink}
                            href={withClientDirectoryReturn(secondPattyPending.href,directoryReturn)}
                          >
                            {secondPattyPending.title}
                          </Link>
                        ) : null}
                        {pendingSummary?.waiting ? <Link className={styles.secondaryActionLink} href={withClientDirectoryReturn(`/admin/pendencias?cliente=${client.id}&responsavel=client#aguardando-cliente`,directoryReturn)}>Aguardando cliente ({pendingSummary.waiting})</Link> : null}
                        {pendingSummary?.operational ? <Link className={styles.secondaryActionLink} href={withClientDirectoryReturn(`/admin/pendencias?cliente=${client.id}&responsavel=operational#operacional-do-sistema`,directoryReturn)}>Operacionais ({pendingSummary.operational})</Link> : null}
                        </div></details> : null}
                        {pendingSummary?.total ? <Link className={styles.secondaryActionLink} href={withClientDirectoryReturn(`/admin/pendencias?cliente=${client.id}`,directoryReturn)}>Todas as pendências ({pendingSummary.total})</Link> : null}
                        <Link
                          aria-label={`Abrir acompanhamento de ${displayName || "registro legado sem nome"}`}
                          className={
                            nextPattyPending
                              ? styles.secondaryActionLink
                              : styles.actionLink
                          }
                          href={withClientDirectoryReturn(`/admin/clientes/${client.id}`,directoryReturn)}
                        >
                          {nextPattyPending ? "Ver cliente" : "Abrir"}
                        </Link>
                      </div>
                    }
                    meta={!client.profile_id ? `Identidade de acesso pendente · ${describeClientPendingSummary(pendingSummary)}` : describeClientPendingSummary(pendingSummary)}
                    name={displayName || "Nome ausente — registro legado"}
                    secondary={
                      !displayName
                        ? "Corrija o nome antes de considerar este cadastro regular."
                        : client.profile_id
                          ? client.status === "active"
                            ? "Cliente ativa"
                            : "Cliente inativa"
                          : "Identidade de acesso não vinculada"
                    }
                    status={
                      !displayName ? (
                        <Badge variant="critical">Nome obrigatório</Badge>
                      ) : !client.profile_id ? (
                        <Badge variant="warning">Completar cadastro</Badge>
                      ) : client.status === "inactive" ? (
                        <Badge variant="neutral">Inativa</Badge>
                      ) : nextPattyPending ? (
                        <Badge variant="warning">Ação profissional</Badge>
                      ) : (
                        <Badge variant="positive">Ativa</Badge>
                      )
                    }
                    visual={<span>{getInitials(displayName)}</span>}
                  />
                </li>
              );
            })}
            </ul>
            {pagedClients.pageCount > 1 ? <nav aria-label="Páginas da lista de clientes" className={styles.pagination}>
              {pagedClients.page > 1 ? <Link href={clientDirectoryPageHref({q:searchTerm,view:viewFilter,page:pagedClients.page-1})}>Anterior</Link> : <span>Anterior</span>}
              {visibleClientDirectoryPages(pagedClients.page,pagedClients.pageCount).map((pageNumber,index,pages)=><span key={pageNumber} className={styles.pageNumber}>{index>0 && pageNumber-pages[index-1]>1 ? <span aria-hidden="true">…</span> : null}{pageNumber===pagedClients.page ? <strong aria-current="page">{pageNumber}</strong> : <Link aria-label={`Ir para página ${pageNumber}`} href={clientDirectoryPageHref({q:searchTerm,view:viewFilter,page:pageNumber})}>{pageNumber}</Link>}</span>)}
              {pagedClients.page < pagedClients.pageCount ? <Link href={clientDirectoryPageHref({q:searchTerm,view:viewFilter,page:pagedClients.page+1})}>Próxima</Link> : <span>Próxima</span>}
            </nav> : null}
          </>
        )}
      </Section>
    </>
  );
}
