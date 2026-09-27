export type OperationalPendingItemKind =
  | "ai_execution_started"
  | "anamnesis_draft"
  | "anamnesis_submitted_without_review"
  | "assessment_draft"
  | "clarification_without_response"
  | "protocol_approved_not_published"
  | "protocol_submitted_not_approved";

export type OperationalPendingItem = {
  clientId: string | null;
  clientLabel: string;
  createdAt: string;
  description: string;
  href: string;
  id: string;
  kind: OperationalPendingItemKind;
  statusLabel: string;
  title: string;
};

export type PendingAnamnesisSubmission = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  id: string;
  reviewCount: number;
  submittedAt: string | null;
};

export type PendingClarificationRequest = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  id: string;
  responseCount: number;
  submissionId: string;
};

export type PendingAssessment = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  finalizedAt: string | null;
  id: string;
};

export type PendingProtocolVersion = {
  approvalCount: number;
  clientId: string;
  clientLabel: string;
  createdAt: string;
  id: string;
  protocolId: string;
  publicationCount: number;
  submittedForReviewAt: string | null;
  versionNumber: number;
};

export type PendingAiExecution = {
  clientId: string | null;
  clientLabel: string;
  createdAt: string;
  id: string;
  purposeKey: string;
};

export type OperationalPendingFactsInput = {
  aiExecutions: PendingAiExecution[];
  anamnesisSubmissions: PendingAnamnesisSubmission[];
  assessments: PendingAssessment[];
  clarificationRequests: PendingClarificationRequest[];
  protocolVersions: PendingProtocolVersion[];
};

function byCreatedAtThenId(
  left: OperationalPendingItem,
  right: OperationalPendingItem,
) {
  const byDate = left.createdAt.localeCompare(right.createdAt);
  return byDate || left.id.localeCompare(right.id);
}

export function buildOperationalPendingItems(
  input: OperationalPendingFactsInput,
): OperationalPendingItem[] {
  const items: OperationalPendingItem[] = [];

  for (const submission of input.anamnesisSubmissions) {
    if (!submission.submittedAt) {
      items.push({
        clientId: submission.clientId,
        clientLabel: submission.clientLabel,
        createdAt: submission.createdAt,
        description:
          "Existe uma submissão de Anamnese criada sem submitted_at. O sistema não infere atraso nem motivo.",
        href: `/admin/anamneses/${submission.id}`,
        id: `anamnesis-draft:${submission.id}`,
        kind: "anamnesis_draft",
        statusLabel: "Rascunho",
        title: "Anamnese ainda não enviada",
      });
      continue;
    }

    if (submission.reviewCount === 0) {
      items.push({
        clientId: submission.clientId,
        clientLabel: submission.clientLabel,
        createdAt: submission.submittedAt,
        description:
          "A Anamnese foi enviada e ainda não possui nota interna de revisão registrada.",
        href: `/admin/anamneses/${submission.id}`,
        id: `anamnesis-review:${submission.id}`,
        kind: "anamnesis_submitted_without_review",
        statusLabel: "Sem revisão registrada",
        title: "Anamnese enviada",
      });
    }
  }

  for (const request of input.clarificationRequests) {
    if (request.responseCount > 0) {
      continue;
    }

    items.push({
      clientId: request.clientId,
      clientLabel: request.clientLabel,
      createdAt: request.createdAt,
      description:
        "Existe um pedido de esclarecimento sem resposta registrada pela cliente.",
      href: `/admin/anamneses/${request.submissionId}/esclarecimentos`,
      id: `clarification:${request.id}`,
      kind: "clarification_without_response",
      statusLabel: "Sem resposta",
      title: "Esclarecimento aguardando resposta",
    });
  }

  for (const assessment of input.assessments) {
    if (assessment.finalizedAt) {
      continue;
    }

    items.push({
      clientId: assessment.clientId,
      clientLabel: assessment.clientLabel,
      createdAt: assessment.createdAt,
      description:
        "A avaliação permanece em rascunho e ainda não foi finalizada explicitamente.",
      href: `/admin/avaliacoes/${assessment.id}`,
      id: `assessment:${assessment.id}`,
      kind: "assessment_draft",
      statusLabel: "Rascunho",
      title: "Avaliação não finalizada",
    });
  }

  for (const version of input.protocolVersions) {
    if (!version.submittedForReviewAt) {
      continue;
    }

    if (version.approvalCount === 0) {
      items.push({
        clientId: version.clientId,
        clientLabel: version.clientLabel,
        createdAt: version.submittedForReviewAt,
        description: `A versão ${version.versionNumber} foi submetida para revisão e ainda não possui aprovação registrada.`,
        href: `/admin/protocolos/${version.protocolId}`,
        id: `protocol-approval:${version.id}`,
        kind: "protocol_submitted_not_approved",
        statusLabel: "Sem aprovação",
        title: "Protocolo submetido para revisão",
      });
      continue;
    }

    if (version.publicationCount === 0) {
      items.push({
        clientId: version.clientId,
        clientLabel: version.clientLabel,
        createdAt: version.submittedForReviewAt,
        description: `A versão ${version.versionNumber} possui aprovação registrada, mas ainda não possui publicação.`,
        href: `/admin/protocolos/${version.protocolId}`,
        id: `protocol-publication:${version.id}`,
        kind: "protocol_approved_not_published",
        statusLabel: "Aprovado, não publicado",
        title: "Protocolo aguardando publicação",
      });
    }
  }

  for (const execution of input.aiExecutions) {
    items.push({
      clientId: execution.clientId,
      clientLabel: execution.clientLabel,
      createdAt: execution.createdAt,
      description: `A execução de IA para ${execution.purposeKey} permanece com status started e sem estado terminal registrado.`,
      href: "/admin/ia",
      id: `ai:${execution.id}`,
      kind: "ai_execution_started",
      statusLabel: "Started",
      title: "Execução de IA sem estado terminal",
    });
  }

  return items.sort(byCreatedAtThenId);
}

export function countOperationalPendingItemsByKind(
  items: OperationalPendingItem[],
) {
  const counts = new Map<OperationalPendingItemKind, number>();

  for (const item of items) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }

  return counts;
}
