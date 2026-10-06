import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  createAccessibleInitialProtocolVersion,
  createAccessibleProtocol,
  deleteAccessibleProtocolWithoutVersions,
  getAccessibleClient,
  listAccessibleProtocolsForClient,
} from "@/lib/supabase/data-access";
import { Button } from "@/components/ui/Button";
import { requireRole } from "@/lib/supabase/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "./page.module.css";

async function createFirstProtocolAction(formData: FormData) {
  "use server";

  const auth = await requireRole("admin");
  const clientId = formData.get("clientId");

  if (typeof clientId !== "string") {
    return;
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return;
  }

  const existing = await listAccessibleProtocolsForClient(client.id);

  if (existing.length > 0) {
    redirect(`/admin/protocolos/${existing[0].id}`);
  }

  const protocol = await createAccessibleProtocol({
    clientId: client.id,
    protocolType: "nutrition",
  });

  try {
    await createAccessibleInitialProtocolVersion({
      clientId: client.id,
      createdByProfileId: auth.profileId,
      protocolId: protocol.id,
    });
  } catch (error) {
    try {
      await deleteAccessibleProtocolWithoutVersions(protocol.id);
    } catch {
      // Best-effort cleanup: never hide the original creation failure.
    }
    throw error;
  }

  redirect(`/admin/protocolos/${protocol.id}`);
}

type AdminClientProtocolsPageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatProtocolType(value: string) {
  return value === "nutrition" ? "Nutricional" : value;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
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
      <ClientWorkspaceHeader
        meta="Acompanhamento ativo"
        displayName={displayName}
        secondary="Histórico de protocolos"
        status={<Badge variant="neutral">Acompanhamento ativo</Badge>}
      />
      <ClientWorkspaceNav clientId={client.id} />
      <Section
        action={<Badge variant="neutral">{protocols.length} protocolo(s)</Badge>}
        description="Consulte o histórico de protocolos desta cliente."
        title="Protocolos"
      >
        {protocols.length === 0 ? (
          <EmptyState
            action={
              <form action={createFirstProtocolAction}>
                <input name="clientId" type="hidden" value={client.id} />
                <Button type="submit">Criar primeiro protocolo</Button>
              </form>
            }
            description="Crie o primeiro protocolo nutricional para iniciar a versão 1 em rascunho. Nada será publicado para a cliente até passar por revisão, aprovação e publicação manual."
            title="Sem protocolos registrados"
          />
        ) : (
          <ol className={styles.protocolList}>
            {protocols.map((protocol) => (
              <li className={styles.protocolItem} key={protocol.id}>
                <div>
                  <h2 className={styles.protocolTitle}>
                    {formatProtocolType(protocol.protocol_type)}
                  </h2>
                  <p className={styles.protocolMeta}>
                    Criado em {formatCreatedAt(protocol.created_at)}
                  </p>
                </div>
                <Link
                  aria-label={`Ver histórico do protocolo ${formatProtocolType(protocol.protocol_type)} criado em ${formatCreatedAt(protocol.created_at)}`}
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
