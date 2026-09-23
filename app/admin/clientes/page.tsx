import { ClientListItem } from "@/components/admin/ClientListItem";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
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
  }>;
};

export default async function AdminClientesPage({
  searchParams,
}: AdminClientesPageProps) {
  const { assignment } = await searchParams;
  const assignments = await listClientsAssignedToCurrentAdmin();
  const clients = assignments?.flatMap((assignment) => assignment.clients ? [assignment.clients] : []) ?? [];

  return (
    <>
      <PageHeader
        description="Clientes com atribuição ativa para o seu perfil administrativo."
        eyebrow="Admin"
        title="Clientes"
      />
      {assignment === "ended" ? (
        <Alert live="polite" title="Atribuição encerrada" variant="success">
          O vínculo atual foi encerrado e o histórico do assignment foi
          preservado.
        </Alert>
      ) : assignment === "unavailable" ? (
        <Alert live="assertive" title="Atribuição indisponível" variant="warning">
          Não havia uma atribuição ativa deste perfil administrativo para
          encerrar.
        </Alert>
      ) : assignment === "invalid" ? (
        <Alert live="assertive" title="Cliente inválida" variant="critical">
          Não foi possível identificar a cliente informada.
        </Alert>
      ) : null}

      <Section
        description="A lista respeita as atribuições ativas e as permissões de acesso vigentes."
        title="Clientes atribuídos"
      >
        {clients.length === 0 ? (
          <p className={styles.emptyMessage}>Nenhuma cliente está atribuída ao seu perfil no momento.</p>
        ) : (
          <ul className={styles.clientList}>
            {clients.map((client) => {
              const displayName = client.profiles?.display_name?.trim();
              return (
                <li key={client.id}>
                  <ClientListItem
                    action={<Link className={styles.actionLink} href={`/admin/clientes/${client.id}`}>Abrir</Link>}
                    meta="Cliente atribuído"
                    name={displayName || "Cliente sem nome informado"}
                    secondary={client.profile_id ? "Conta vinculada" : "Conta ainda não vinculada"}
                    status={<Badge variant="neutral">Atribuição ativa</Badge>}
                    visual={<span>{getInitials(displayName)}</span>}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
