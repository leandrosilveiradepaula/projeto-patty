import { ClientListItem } from "@/components/admin/ClientListItem";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextInput } from "@/components/ui/TextInput";
import { Section } from "@/components/ui/Section";
import { listClientsAssignedToCurrentAdmin } from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function getInitials(displayName: string | null | undefined) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

type AdminClientesPageProps = {
  searchParams: Promise<{
    assignment?: string;
    onboarding?: string;
    q?: string;
  }>;
};

export default async function AdminClientesPage({
  searchParams,
}: AdminClientesPageProps) {
  const { assignment, onboarding, q } = await searchParams;
  const assignments = await listClientsAssignedToCurrentAdmin();
  const clients = assignments?.flatMap((assignment) => assignment.clients ? [assignment.clients] : []) ?? [];
  const searchTerm = q?.trim() ?? "";
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const filteredClients = normalizedSearchTerm
    ? clients.filter((client) =>
        normalizeSearchValue(client.profiles?.display_name ?? "").includes(
          normalizedSearchTerm,
        ),
      )
    : clients;

  return (
    <>
      <PageHeader
        description="Encontre clientes e acesse rapidamente o acompanhamento de cada uma."
        eyebrow="Admin"
        title="Clientes"
      />
      {onboarding === "invited" ? (
        <Alert live="polite" title="Convite enviado" variant="success">
          A conta inicial da cliente foi provisionada e o convite de ativação foi enviado.
        </Alert>
      ) : assignment === "ended" ? (
        <Alert live="polite" title="Acompanhamento encerrado" variant="success">
          O acompanhamento atual foi encerrado e o histórico da cliente foi preservado.
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
        description="Encontre rapidamente uma cliente pelo nome."
        title="Em acompanhamento"
      >
        <form action="/admin/clientes" className={styles.searchForm} method="get">
          <label className={styles.searchLabel} htmlFor="client-search">
            Buscar cliente
          </label>
          <div className={styles.searchRow}>
            <TextInput
              defaultValue={searchTerm}
              id="client-search"
              name="q"
              placeholder="Digite o nome da cliente"
              type="search"
            />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
            {searchTerm ? (
              <Link className={styles.clearLink} href="/admin/clientes">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        {clients.length === 0 ? (
          <p className={styles.emptyMessage}>Nenhuma cliente está em acompanhamento no momento.</p>
        ) : filteredClients.length === 0 ? (
          <p className={styles.emptyMessage}>Nenhuma cliente encontrada para “{searchTerm}”.</p>
        ) : (
          <>
            {searchTerm ? (
              <p className={styles.resultCount}>
                {filteredClients.length} de {clients.length} cliente(s) encontrada(s).
              </p>
            ) : null}
            <ul className={styles.clientList}>
            {filteredClients.map((client) => {
              const displayName = client.profiles?.display_name?.trim();
              return (
                <li key={client.id}>
                  <ClientListItem
                    action={<Link className={styles.actionLink} href={`/admin/clientes/${client.id}`}>Abrir</Link>}
                    name={displayName || "Cadastro incompleto"}
                    secondary={
                      client.profile_id
                        ? "Acompanhamento ativo"
                        : "Conta da cliente ainda não vinculada"
                    }
                    status={
                      !client.profile_id ? (
                        <Badge variant="warning">Completar cadastro</Badge>
                      ) : null
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
