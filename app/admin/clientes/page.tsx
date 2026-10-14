import { ClientListItem } from "@/components/admin/ClientListItem";
import { matchesClientDirectoryName, readClientDirectorySearchTerm } from "@/lib/clients/client-directory-search";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextInput } from "@/components/ui/TextInput";
import { Section } from "@/components/ui/Section";
import { getOperationalPendingItemsForCurrentAdmin } from "@/lib/operations/pending-data";
import { groupOperationalPendingItems } from "@/lib/operations/pending";
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
  const pattyPendingItems = groupOperationalPendingItems(pendingItems).patty;
  const pattyPendingItemsByClientId = new Map<
    string,
    typeof pattyPendingItems
  >();

  for (const item of pattyPendingItems) {
    if (!item.clientId) {
      continue;
    }

    const current = pattyPendingItemsByClientId.get(item.clientId) ?? [];
    current.push(item);
    pattyPendingItemsByClientId.set(item.clientId, current);
  }
  const clientsWithPattyActions = clients.filter(client => pattyPendingItemsByClientId.has(client.id)).length;
  const actionablePattyItems = clients.reduce((count, client) => count + (pattyPendingItemsByClientId.get(client.id)?.length ?? 0), 0);
  const searchTerm = readClientDirectorySearchTerm(q);
  const viewFilter = view === "patty" ? "patty" : "all";
  const filteredClients = clients.filter((client) => {
    const matchesSearch = matchesClientDirectoryName(
      searchTerm, client.full_name, client.profiles?.display_name,
    );
    const matchesView =
      viewFilter === "all" || pattyPendingItemsByClientId.has(client.id);

    return matchesSearch && matchesView;
  });

  const visiblePattyActions = filteredClients.reduce((count, client) => count + (pattyPendingItemsByClientId.get(client.id)?.length ?? 0), 0);

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
        description="Busque por nome ou filtre clientes com ação da Patty. Este filtro não inclui itens aguardando resposta da cliente."
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
              <option value="all">Todas em acompanhamento</option>
              <option value="patty">Com ação da Patty ({clientsWithPattyActions})</option>
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
            <p role="status">{viewFilter === "patty" ? (searchTerm ? `Nenhuma cliente com ação da Patty corresponde à busca por “${searchTerm}”.` : "Nenhuma cliente em acompanhamento possui ação da Patty nesta fila.") : `Nenhuma cliente corresponde à busca por “${searchTerm}”.`}</p>
            <Link className={styles.clearLink} href="/admin/clientes">Limpar filtros</Link>
          </div>
        ) : (
          <>
            {searchTerm || viewFilter !== "all" ? (
              <p className={styles.resultCount}>
                {filteredClients.length} de {clients.length} cliente(s) exibida(s) · {visiblePattyActions} ação(ões) da Patty nas clientes exibidas.
              </p>
            ) : null}
            <ul className={styles.clientList}>
            {filteredClients.map((client) => {
              const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();
              const clientPattyPendingItems =
                pattyPendingItemsByClientId.get(client.id) ?? [];
              const nextPattyPending = clientPattyPendingItems[0] ?? null;
              const secondPattyPending = clientPattyPendingItems[1] ?? null;

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
                            Abrir ação
                          </Link>
                        ) : null}
                        {secondPattyPending ? (
                          <Link
                            aria-label={`Abrir outra ação: ${secondPattyPending.title.toLocaleLowerCase("pt-BR")} de ${displayName || "registro legado sem nome"}`}
                            className={styles.secondaryActionLink}
                            href={secondPattyPending.href}
                          >
                            Outra ação
                          </Link>
                        ) : null}
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
                          : "Sem item na fila da Patty"
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
