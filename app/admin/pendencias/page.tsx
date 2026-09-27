import { PendingItemCard } from "@/components/admin/PendingItemCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  buildOperationalPendingItems,
  type OperationalPendingItem,
  type OperationalPendingKind,
} from "@/lib/admin/operational-pending";
import {
  listAccessibleAnamnesisClarificationResponses,
  listAccessibleAnamnesisSubmissionsForAdminPending,
  listAccessibleClarificationRequestsForAdminPending,
  listAccessibleClientAssessments,
  listAccessibleNonterminalAiExecutions,
  listAccessibleProtocolPublications,
  listAccessibleProtocolVersionApprovals,
  listAccessibleProtocolVersionsForAdminPending,
  listClientsAssignedToCurrentAdmin,
} from "@/lib/supabase/data-access";
import Link from "next/link";

import styles from "./page.module.css";

const GROUPS: Array<{
  description: string;
  kinds: OperationalPendingKind[];
  title: string;
}> = [
  {
    description:
      "Rascunhos e pedidos de esclarecimento sem resposta registrada.",
    kinds: ["anamnesis_draft", "clarification_waiting_response"],
    title: "Anamnese e esclarecimentos",
  },
  {
    description:
      "Avaliações criadas que ainda não possuem finalização registrada.",
    kinds: ["assessment_draft"],
    title: "Avaliações",
  },
  {
    description:
      "Versões em estados abertos do lifecycle manual de protocolo.",
    kinds: [
      "protocol_draft",
      "protocol_waiting_approval",
      "protocol_waiting_publication",
    ],
    title: "Protocolos",
  },
  {
    description:
      "Executions acessíveis que permanecem started sem estado terminal.",
    kinds: ["ai_nonterminal"],
    title: "IA",
  },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function displayClientName(
  namesByClientId: Map<string, string | null>,
  clientId: string,
) {
  return namesByClientId.get(clientId)?.trim() || "Cliente sem nome informado";
}

function PendingList({ items }: { items: OperationalPendingItem[] }) {
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <PendingItemCard
          action={
            <Link className={styles.actionLink} href={item.href}>
              Abrir registro
            </Link>
          }
          description={item.description}
          key={item.id}
          meta={
            <>
              {item.clientName || "Cliente sem nome informado"} ·{" "}
              {formatDateTime(item.occurredAt)}
            </>
          }
          status={<Badge variant="neutral">{item.statusLabel}</Badge>}
          title={item.title}
        />
      ))}
    </div>
  );
}

export default async function AdminPendenciasPage() {
  const [
    assignments,
    submissions,
    clarificationRequests,
    assessments,
    protocolVersions,
    aiExecutions,
  ] = await Promise.all([
    listClientsAssignedToCurrentAdmin(),
    listAccessibleAnamnesisSubmissionsForAdminPending(),
    listAccessibleClarificationRequestsForAdminPending(),
    listAccessibleClientAssessments(),
    listAccessibleProtocolVersionsForAdminPending(),
    listAccessibleNonterminalAiExecutions(),
  ]);

  const clientNames = new Map(
    assignments.flatMap((assignment) =>
      assignment.clients
        ? [
            [
              assignment.clients.id,
              assignment.clients.profiles?.display_name ?? null,
            ] as const,
          ]
        : [],
    ),
  );

  const clarificationRequestIds = clarificationRequests.map(
    (request) => request.id,
  );
  const protocolVersionIds = protocolVersions.map((version) => version.id);

  const [clarificationResponses, approvals, publications] = await Promise.all([
    listAccessibleAnamnesisClarificationResponses(clarificationRequestIds),
    listAccessibleProtocolVersionApprovals(protocolVersionIds),
    listAccessibleProtocolPublications(protocolVersionIds),
  ]);

  const submissionById = new Map(
    submissions.map((submission) => [submission.id, submission]),
  );
  const responseCounts = new Map<string, number>();

  for (const response of clarificationResponses) {
    responseCounts.set(
      response.clarification_request_id,
      (responseCounts.get(response.clarification_request_id) ?? 0) + 1,
    );
  }

  const approvedVersionIds = new Set(
    approvals.map((approval) => approval.protocol_version_id),
  );
  const publishedVersionIds = new Set(
    publications.map((publication) => publication.protocol_version_id),
  );

  const items = buildOperationalPendingItems({
    anamnesisDrafts: submissions
      .filter((submission) => !submission.submitted_at)
      .map((submission) => ({
        clientId: submission.client_id,
        clientName: displayClientName(clientNames, submission.client_id),
        createdAt: submission.created_at,
        id: submission.id,
      })),
    clarificationRequests: clarificationRequests.flatMap((request) => {
      const submission = submissionById.get(request.submission_id);

      if (!submission) {
        return [];
      }

      return [
        {
          clientId: submission.client_id,
          clientName: displayClientName(clientNames, submission.client_id),
          createdAt: request.created_at,
          id: request.id,
          responseCount: responseCounts.get(request.id) ?? 0,
          submissionId: submission.id,
        },
      ];
    }),
    assessmentDrafts: assessments
      .filter((assessment) => !assessment.finalized_at)
      .map((assessment) => ({
        assessedAt: assessment.assessed_at,
        clientId: assessment.client_id,
        clientName: displayClientName(clientNames, assessment.client_id),
        id: assessment.id,
      })),
    protocolVersions: protocolVersions.map((version) => ({
      approved: approvedVersionIds.has(version.id),
      clientId: version.client_id,
      clientName: displayClientName(clientNames, version.client_id),
      createdAt: version.created_at,
      id: version.id,
      protocolId: version.protocol_id,
      published: publishedVersionIds.has(version.id),
      submittedAt: version.submitted_for_review_at,
      versionNumber: version.version_number,
    })),
    aiExecutions: aiExecutions.map((execution) => ({
      anamnesisSubmissionId: execution.anamnesis_submission_id,
      clientId: execution.client_id,
      clientName: displayClientName(clientNames, execution.client_id),
      createdAt: execution.created_at,
      id: execution.id,
      purposeKey: execution.purpose_key,
    })),
  });

  return (
    <>
      <PageHeader
        actions={<Badge variant="neutral">Estados abertos: {items.length}</Badge>}
        description="Estados factuais já registrados no backend. A ordem é determinística por tipo e data; não representa prioridade, urgência, adesão ou prazo."
        eyebrow="Admin"
        title="Pendências operacionais"
      />

      {items.length === 0 ? (
        <Section
          description="Nenhum dos estados abertos atualmente cobertos pelo painel foi encontrado."
          title="Estados em aberto"
        >
          <EmptyState
            description="O painel não encontrou rascunhos, esclarecimentos sem resposta, protocolos em lifecycle aberto ou executions de IA sem estado terminal."
            title="Nenhuma pendência factual encontrada"
          />
        </Section>
      ) : (
        GROUPS.map((group) => {
          const groupItems = items.filter((item) =>
            group.kinds.includes(item.kind),
          );

          if (groupItems.length === 0) {
            return null;
          }

          return (
            <Section
              action={<Badge variant="neutral">{groupItems.length}</Badge>}
              description={group.description}
              key={group.title}
              title={group.title}
            >
              <PendingList items={groupItems} />
            </Section>
          );
        })
      )}

      <Section
        description="Este painel deliberadamente não transforma dados em prioridade profissional."
        title="Limites"
      >
        <div className={styles.limitCard}>
          <p>
            Não são inferidos atraso, severidade, risco, adesão, estagnação ou
            necessidade de avanço/retorno de protocolo. Novos tipos de
            pendência só devem entrar aqui quando o significado operacional
            estiver documentado.
          </p>
        </div>
      </Section>
    </>
  );
}
