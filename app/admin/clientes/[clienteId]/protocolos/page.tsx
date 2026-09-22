import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleProtocolsForClient,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClientProtocolsPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClientProtocolsPage({
  params,
}: AdminClientProtocolsPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const protocols = await listAccessibleProtocolsForClient(client.id);
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Histórico de protocolos"
        status={<Badge variant="neutral">Atribuição ativa</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />
      <Section
        action={<Badge variant="neutral">{protocols.length} protocolo(s)</Badge>}
        description="Protocolos desta cliente acessíveis conforme a atribuição administrativa ativa."
        title="Protocolos"
      >
        {protocols.length === 0 ? (
          <EmptyState
            description="Nenhum protocolo está registrado para esta cliente."
            title="Sem protocolos registrados"
          />
        ) : (
          <ol className={styles.protocolList}>
            {protocols.map((protocol) => (
              <li className={styles.protocolItem} key={protocol.id}>
                <div>
                  <h2 className={styles.protocolTitle}>
                    {protocol.protocol_type}
                  </h2>
                  <p className={styles.protocolMeta}>
                    Criado em {formatCreatedAt(protocol.created_at)}
                  </p>
                </div>
                <Link
                  className={styles.actionLink}
                  href={`/admin/protocolos/${protocol.id}`}
                >
                  Ver histórico
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
