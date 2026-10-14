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
import { summarizeClientPendingItems } from "@/lib/operations/client-pending-summary";
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
  }>;
};

export default async function AdminClientesPage({
  searchParams,
}: AdminClientesPageProps) {
  const { assignment, onboarding, q, view } = await searchParams;
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
  const viewCounts = countClientDirectoryPendingViews(clients.map(client=>client.id),pendingByClientId);
  const filteredClients = clients.filter((client) => {
    const matchesSearch = matchesClientDirectoryName(
      searchTerm, client.full_name, client.profiles?.display_name,
    );
    const matchesView =
      matchesClientDirectoryPendingView(pendingByClientId.get(client.id),viewFilter);

    return matchesSearch && matchesView;
  });

  const visiblePendingItems = filteredClients.reduce((count, client) => count + (pendingByClientId.get(client.id)?.total ?? 0), 0);
  const visiblePattyActions = filteredClients.reduce((count, client) => count + (pendingByClientId.get(client.id)?.patty.length ?? 0), 0);

  return (
    <>
      <PageHeader
        description="Encontre clientes e acesse rapidamente o acompanhamento de cada uma."
        eyebrow="Admin"
        title="Clientes"
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
        description="Busque pelo nome ou filtre por ações da Patty, respostas aguardadas, pendências operacionais e clientes sem pendências."
        title="Em acompanhamento"
      >
        <div className={styles.queueSummary}>
          <p role="status"><strong>{clientsWithPattyActions} cliente(s)</strong> com {actionablePattyItems} ação(ões) da Patty nos acompanhamentos autorizados.</p>
          <Link className={styles.queueLink} href="/admin/pendencias?responsavel=patty">Abrir fila de ações da Patty</Link>
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
                {filteredClients.length} de {clients.length} cliente(s) exibida(s) · {visiblePendingItems} pendência(s) nas clientes exibidas, incluindo {visiblePattyActions} ação(ões) da Patty.
              </p>
            ) : null}
            <ul className={styles.clientList}>
            {filteredClients.map((client) => {
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
                            href={nextPattyPending.href}
                          >
                            {nextPattyPending.title}
                          </Link>
                        ) : null}
                        {secondPattyPending ? (
                          <Link
                            aria-label={`Abrir outra ação: ${secondPattyPending.title.toLocaleLowerCase("pt-BR")} de ${displayName || "registro legado sem nome"}`}
                            className={styles.secondaryActionLink}
                            href={secondPattyPending.href}
                          >
                            {secondPattyPending.title}
                          </Link>
                        ) : null}
                        {pendingSummary?.waiting ? <Link className={styles.secondaryActionLink} href={`/admin/pendencias?cliente=${client.id}&responsavel=client#aguardando-cliente`}>Aguardando cliente ({pendingSummary.waiting})</Link> : null}
                        {pendingSummary?.operational ? <Link className={styles.secondaryActionLink} href={`/admin/pendencias?cliente=${client.id}&responsavel=operational#operacional-do-sistema`}>Operacionais ({pendingSummary.operational})</Link> : null}
                        {pendingSummary?.total ? <Link className={styles.secondaryActionLink} href={`/admin/pendencias?cliente=${client.id}`}>Todas as pendências ({pendingSummary.total})</Link> : null}
                        <Link
                          aria-label={`Abrir acompanhamento de ${displayName || "registro legado sem nome"}`}
                          className={
                            nextPattyPending
                              ? styles.secondaryActionLink
                              : styles.actionLink
                          }
                          href={`/admin/clientes/${client.id}`}
                        >
                          {nextPattyPending ? "Ver cliente" : "Abrir"}
                        </Link>
                      </div>
                    }
                    meta={
                      !client.profile_id
                        ? "Vincule a identidade de acesso da cliente para concluir o cadastro."
                        : nextPattyPending
                          ? `${nextPattyPending.title} · ${clientPattyPendingItems.length} item(ns) na fila da Patty`
                          : pendingSummary?.waiting ? `Aguardando cliente: ${pendingSummary.waiting} pendência(s)` : pendingSummary?.operational ? `Pendências operacionais: ${pendingSummary.operational}` : "Sem pendências registradas"
                    }
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
                        <Badge variant="warning">Ação da Patty</Badge>
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
          </>
        )}
      </Section>
    </>
  );
}
