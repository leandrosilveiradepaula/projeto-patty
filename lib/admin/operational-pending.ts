export const OPERATIONAL_PENDING_KIND_ORDER = [
  "anamnesis_draft",
  "clarification_waiting_response",
  "assessment_draft",
  "protocol_draft",
  "protocol_waiting_approval",
  "protocol_waiting_publication",
  "ai_nonterminal",
] as const;

export type OperationalPendingKind =
  (typeof OPERATIONAL_PENDING_KIND_ORDER)[number];

export type OperationalPendingItem = {
  clientId: string | null;
  clientName: string | null;
  description: string;
  href: string;
  id: string;
  kind: OperationalPendingKind;
  occurredAt: string;
  statusLabel: string;
  title: string;
};

export type OpenAnamnesisDraft = {
  clientId: string;
  clientName: string | null;
  createdAt: string;
  id: string;
};

export type OpenClarificationRequest = {
  clientId: string;
  clientName: string | null;
  createdAt: string;
  id: string;
  responseCount: number;
  submissionId: string;
};

export type OpenAssessmentDraft = {
  assessedAt: string;
  clientId: string;
  clientName: string | null;
  id: string;
};

export type ProtocolVersionState = {
  approved: boolean;
  clientId: string;
  clientName: string | null;
  createdAt: string;
  id: string;
  protocolId: string;
  published: boolean;
  submittedAt: string | null;
  versionNumber: number;
};

export type NonterminalAiExecution = {
  anamnesisSubmissionId: string | null;
  clientId: string;
  clientName: string | null;
  createdAt: string;
  id: string;
  purposeKey: string;
};

export type OperationalPendingInput = {
  aiExecutions: NonterminalAiExecution[];
  anamnesisDrafts: OpenAnamnesisDraft[];
  assessmentDrafts: OpenAssessmentDraft[];
  clarificationRequests: OpenClarificationRequest[];
  protocolVersions: ProtocolVersionState[];
};

function compareItems(a: OperationalPendingItem, b: OperationalPendingItem) {
  const kindDifference =
    OPERATIONAL_PENDING_KIND_ORDER.indexOf(a.kind) -
    OPERATIONAL_PENDING_KIND_ORDER.indexOf(b.kind);

  if (kindDifference !== 0) {
    return kindDifference;
  }

  const dateDifference =
    new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return a.id.localeCompare(b.id);
}

export function buildOperationalPendingItems(
  input: OperationalPendingInput,
): OperationalPendingItem[] {
  const items: OperationalPendingItem[] = [];

  for (const draft of input.anamnesisDrafts) {
    items.push({
      clientId: draft.clientId,
      clientName: draft.clientName,
      description:
        "Existe uma Anamnese iniciada sem submissão final registrada.",
      href: `/admin/anamneses/${draft.id}`,
      id: `anamnesis:${draft.id}`,
      kind: "anamnesis_draft",
      occurredAt: draft.createdAt,
      statusLabel: "Rascunho",
      title: "Anamnese em rascunho",
    });
  }

  for (const request of input.clarificationRequests) {
    if (request.responseCount > 0) {
      continue;
    }

    items.push({
      clientId: request.clientId,
      clientName: request.clientName,
      description:
        "Há um pedido de esclarecimento sem resposta registrada da cliente.",
      href: `/admin/anamneses/${request.submissionId}/esclarecimentos`,
      id: `clarification:${request.id}`,
      kind: "clarification_waiting_response",
      occurredAt: request.createdAt,
      statusLabel: "Sem resposta",
      title: "Esclarecimento em aberto",
    });
  }

  for (const draft of input.assessmentDrafts) {
    items.push({
      clientId: draft.clientId,
      clientName: draft.clientName,
      description:
        "A avaliação foi criada e ainda não possui finalização registrada.",
      href: `/admin/avaliacoes/${draft.id}`,
      id: `assessment:${draft.id}`,
      kind: "assessment_draft",
      occurredAt: draft.assessedAt,
      statusLabel: "Rascunho",
      title: "Avaliação em rascunho",
    });
  }

  for (const version of input.protocolVersions) {
    if (!version.submittedAt) {
      items.push({
        clientId: version.clientId,
        clientName: version.clientName,
        description:
          "A versão existe como rascunho e ainda não foi submetida para revisão.",
        href: `/admin/protocolos/${version.protocolId}`,
        id: `protocol-draft:${version.id}`,
        kind: "protocol_draft",
        occurredAt: version.createdAt,
        statusLabel: "Rascunho",
        title: `Protocolo v${version.versionNumber} em rascunho`,
      });
      continue;
    }

    if (!version.approved) {
      items.push({
        clientId: version.clientId,
        clientName: version.clientName,
        description:
          "A versão foi submetida para revisão e ainda não possui aprovação registrada.",
        href: `/admin/protocolos/${version.protocolId}`,
        id: `protocol-review:${version.id}`,
        kind: "protocol_waiting_approval",
        occurredAt: version.submittedAt,
        statusLabel: "Submetido",
        title: `Protocolo v${version.versionNumber} aguardando aprovação`,
      });
      continue;
    }

    if (!version.published) {
      items.push({
        clientId: version.clientId,
        clientName: version.clientName,
        description:
          "A versão possui aprovação registrada e ainda não possui publicação registrada.",
        href: `/admin/protocolos/${version.protocolId}`,
        id: `protocol-publication:${version.id}`,
        kind: "protocol_waiting_publication",
        occurredAt: version.submittedAt,
        statusLabel: "Aprovado",
        title: `Protocolo v${version.versionNumber} sem publicação`,
      });
    }
  }

  for (const execution of input.aiExecutions) {
    items.push({
      clientId: execution.clientId,
      clientName: execution.clientName,
      description:
        "A execution permanece em status started sem conclusão ou falha terminal registrada.",
      href: execution.anamnesisSubmissionId
        ? `/admin/anamneses/${execution.anamnesisSubmissionId}/revisao`
        : "/admin/ia",
      id: `ai:${execution.id}`,
      kind: "ai_nonterminal",
      occurredAt: execution.createdAt,
      statusLabel: "Started",
      title: "IA sem estado terminal",
    });
  }

  return items.sort(compareItems);
}

export function countOperationalPendingByKind(
  items: OperationalPendingItem[],
): Record<OperationalPendingKind, number> {
  const counts = Object.fromEntries(
    OPERATIONAL_PENDING_KIND_ORDER.map((kind) => [kind, 0]),
  ) as Record<OperationalPendingKind, number>;

  for (const item of items) {
    counts[item.kind] += 1;
  }

  return counts;
}
