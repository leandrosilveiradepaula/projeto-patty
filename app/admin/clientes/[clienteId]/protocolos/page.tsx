import { buildProtocolOperationalSummaries, protocolOperationalStatusLabel, protocolPublicationDate, operationalProtocolVersionHref } from "@/lib/protocol/operational-catalog";
import { AdminProtocolInitialVersionForm } from "@/components/admin/AdminProtocolInitialVersionForm";
import { existingProtocolNavigation } from "@/lib/protocol/admin-catalog-ux";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Section } from "@/components/ui/Section";
import {
  createAccessibleInitialProtocolVersion,
  createAccessibleProtocol,
  deleteAccessibleProtocolWithoutVersions,
  getAccessibleClient,
  listAccessibleProtocolsForClient,
  listAccessibleProtocolVersions,
  listAccessibleProtocolVersionsForProtocols,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
} from "@/lib/supabase/data-access";
import { requireRole } from "@/lib/supabase/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation/uuid";
import styles from "./page.module.css";

async function createFirstProtocolAction(formData: FormData) {
  "use server";

  const auth = await requireRole("admin");
  const clientId = formData.get("clientId");

  if (typeof clientId !== "string" || !isUuid(clientId)) {
    return;
  }

  const client = await getAccessibleClient(clientId);

  if (!client) {
    return;
  }

  const existing = await listAccessibleProtocolsForClient(client.id);

  if (existing.length > 0) {
    const versions = await listAccessibleProtocolVersionsForProtocols(existing.map((item) => item.id));
    const versionedIds = new Set(versions.map((version) => version.protocol_id));
  const [approvals, publications] = await Promise.all([
    listAccessibleProtocolVersionApprovals(versions.map(version => version.id)),
    listAccessibleProtocolPublications(versions.map(version => version.id)),
  ]);
  const summaries = buildProtocolOperationalSummaries(
    protocols.map(protocol => protocol.id), versions, approvals, publications,
  );
    const destination = existingProtocolNavigation(existing, versionedIds);
    if (destination?.kind === "recover") {
      redirect(`/admin/clientes/${client.id}/protocolos?recuperacao=necessaria#protocolo-${destination.id}`);
    }
    if (destination) redirect(`/admin/protocolos/${destination.id}`);
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
  } catch {
    // The first insert may already have succeeded. Never present a raw error
    // or assume a compensating DELETE removed anything.
    let removed = false;
    try {
      removed = await deleteAccessibleProtocolWithoutVersions(protocol.id);
    } catch {
      // The durable protocol remains visible for explicit recovery.
    }
    redirect(`/admin/clientes/${client.id}/protocolos?recuperacao=${removed ? "criacao" : "necessaria"}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/protocolos");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/protocolos`);
  redirect(`/admin/protocolos/${protocol.id}`);
}

async function resumeVersionlessProtocolAction(formData: FormData) {
  "use server";

  const auth = await requireRole("admin");
  const clientId = formData.get("clientId");
  const protocolId = formData.get("protocolId");
  if (typeof clientId !== "string" || !isUuid(clientId) ||
      typeof protocolId !== "string" || !isUuid(protocolId)) return;

  const client = await getAccessibleClient(clientId);
  if (!client) return;
  const protocols = await listAccessibleProtocolsForClient(client.id);
  if (!protocols.some((item) => item.id === protocolId)) return;

  const versions = await listAccessibleProtocolVersions(protocolId);
  if (versions.length === 0) {
    try {
      await createAccessibleInitialProtocolVersion({
        clientId: client.id,
        createdByProfileId: auth.profileId,
        protocolId,
      });
    } catch {
      // A concurrent tab may have created version 1. Verify, never guess.
      const afterConflict = await listAccessibleProtocolVersions(protocolId);
      if (afterConflict.length === 0) {
        redirect(`/admin/clientes/${client.id}/protocolos?recuperacao=erro`);
      }
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/pendencias");
  revalidatePath("/admin/protocolos");
  revalidatePath(`/admin/clientes/${client.id}`);
  revalidatePath(`/admin/clientes/${client.id}/protocolos`);
  redirect(`/admin/protocolos/${protocolId}`);
}

type AdminClientProtocolsPageProps = {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ recuperacao?: string | string[] }>;
};

function formatProtocolType(value: string) {
  return value === "nutrition" ? "Nutricional" : value;
}

function formatCreatedAt(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClientProtocolsPage({
  params,
  searchParams,
}: AdminClientProtocolsPageProps) {
  const [{ clienteId }, { recuperacao }] = await Promise.all([params, searchParams]);
  if (!isUuid(clienteId)) notFound();
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const protocols = await listAccessibleProtocolsForClient(client.id);
  const versions = await listAccessibleProtocolVersionsForProtocols(protocols.map((item) => item.id));
  const versionedIds = new Set(versions.map((version) => version.protocol_id));
  const displayName = client.full_name?.trim() || client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Versões, revisão, aprovação e publicação"
        displayName={displayName}
        secondary="Histórico de protocolos"
        status={<Badge variant="neutral">{protocols.length} protocolo(s)</Badge>}
      />
      <ClientWorkspaceNav activeArea="protocolos" clientId={client.id} />
      <Section
        description="A publicação depende de revisão e aprovação explícitas. Depois, continue o acompanhamento nas áreas reais da cliente."
        title="Continuidade do acompanhamento"
      >
        <Link className={styles.actionLink} href={`/admin/clientes/${client.id}/feedback-semanal`}>
          Acompanhar feedback semanal
        </Link>
        {" · "}
        <Link className={styles.actionLink} href={`/admin/clientes/${client.id}/treino`}>
          Consultar treino
        </Link>
        {" · "}
        <Link className={styles.actionLink} href={`/admin/clientes/${client.id}/conteudos`}>
          Liberar conteúdos
        </Link>
      </Section>
      <Section
        description="Consulte o histórico de protocolos desta cliente."
        title="Protocolos"
      >
        {typeof recuperacao === "string" && ["necessaria", "criacao", "erro"].includes(recuperacao) ? (
          <Alert title="Verifique a versão inicial" variant={recuperacao === "necessaria" ? "warning" : "critical"}>
            {recuperacao === "necessaria"
              ? "Um protocolo foi registrado sem versão inicial. Use Retomar versão inicial para continuar."
              : recuperacao === "criacao"
                ? "A criação não foi concluída. Nenhum protocolo novo foi confirmado; tente novamente."
                : "A versão inicial não foi confirmada. Atualize a página antes de tentar novamente."}
          </Alert>
        ) : null}
        {protocols.length === 0 ? (
          <EmptyState
            action={
              <AdminProtocolInitialVersionForm action={createFirstProtocolAction} clientId={client.id} />
            }
            description="Crie o primeiro protocolo nutricional para iniciar a versão 1 em rascunho. Nada será publicado para a cliente até passar por revisão, aprovação e publicação manual."
            title="Sem protocolos registrados"
          />
        ) : (
          <ol className={styles.protocolList}>
            {protocols.map((protocol) => {
              const facts = summaries.get(protocol.id);
              const latest = facts?.latestVersion ?? null;
              const published = facts?.lastPublishedVersion ?? null;
              const latestHref = operationalProtocolVersionHref(protocol.id,latest);
              const publishedHref = operationalProtocolVersionHref(protocol.id,published);
              return <li className={styles.protocolItem} id={`protocolo-${protocol.id}`} key={protocol.id}>
                <div className={styles.protocolSummary}>
                  <h2 className={styles.protocolTitle}>{formatProtocolType(protocol.protocol_type)}</h2>
                  <p className={styles.protocolMeta}>Criado em {formatCreatedAt(protocol.created_at)}</p>
                  <p className={styles.protocolMeta}>Situação: {facts ? protocolOperationalStatusLabel(facts.latestStatus) : "Indisponível"}</p>
                  {latest ? <p className={styles.protocolMeta}>Última versão: {latest.version_number} · {facts?.versionCount ?? 0} versão(ões)</p> : null}
                  {published ? <p className={styles.protocolMeta}>Última publicação: versão {published.version_number} · {protocolPublicationDate(facts?.lastPublishedAt ?? null)}</p> : <p className={styles.protocolMeta}>Nenhuma publicação registrada neste protocolo.</p>}
                  {facts?.hasUnpublishedNewerVersion ? <p role="status" className={styles.protocolMeta}>Existe versão mais recente não publicada. A publicação anterior continua vigente.</p> : null}
                </div>
                <div className={styles.protocolActions}>
                  {versionedIds.has(protocol.id) ? <>
                    <Link className={styles.actionLink} href={latestHref ?? `/admin/protocolos/${protocol.id}`}>Abrir versão atual de trabalho</Link>
                    {publishedHref ? <Link className={styles.actionLink} href={publishedHref}>Consultar última publicada</Link> : null}
                    <Link className={styles.actionLink} href={`/admin/protocolos/${protocol.id}`}>Histórico completo</Link>
                  </> : <AdminProtocolInitialVersionForm
                    action={resumeVersionlessProtocolAction} clientId={client.id} protocolId={protocol.id}
                  />}
                </div>
              </li>;
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
