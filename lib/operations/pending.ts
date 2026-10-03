export type OperationalPendingItemKind =
  | "ai_execution_started"
  | "anamnesis_draft"
  | "anamnesis_submitted_without_review"
  | "assessment_draft"
  | "clarification_response_pending_review"
  | "clarification_without_response"
  | "protocol_approved_not_published"
  | "protocol_submitted_not_approved"\n  | "weekly_feedback_awaiting_response";

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
  resolved: boolean;
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

export type PendingWeeklyFeedback = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  dueAt: string | null;
  id: string;
  periodEnd: string;
  periodStart: string;
  submittedAt: string | null;
};

export type OperationalPendingFactsInput = {
  aiExecutions: PendingAiExecution[];
  anamnesisSubmissions: PendingAnamnesisSubmission[];
  assessments: PendingAssessment[];
  clarificationReminderIntervalHours: number;
  clarificationRequests: PendingClarificationRequest[];
  protocolVersions: PendingProtocolVersion[];
  referenceNow?: string;
  weeklyFeedbacks?: PendingWeeklyFeedback[];
};

function clarificationFirstReminderDueAt(
  createdAt: string,
  intervalHours: number,
) {
  return new Date(
    new Date(createdAt).getTime() + intervalHours * 60 * 60 * 1000,
  ).toISOString();
}

function isClarificationFirstReminderDue(
  createdAt: string,
  referenceNow: string,
  intervalHours: number,
) {
  return (
    new Date(referenceNow).getTime() >=
    new Date(createdAt).getTime() + intervalHours * 60 * 60 * 1000
  );
}

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
  const referenceNow = input.referenceNow ?? new Date().toISOString();

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
    if (request.resolved) {
      continue;
    }

    if (request.responseCount === 0) {
      const firstReminderDue = isClarificationFirstReminderDue(
        request.createdAt,
        referenceNow,
        input.clarificationReminderIntervalHours,
      );
      const firstReminderDueAt = clarificationFirstReminderDueAt(
        request.createdAt,
        input.clarificationReminderIntervalHours,
      );

      items.push({
        clientId: request.clientId,
        clientLabel: request.clientLabel,
        createdAt: request.createdAt,
        description: firstReminderDue
          ? `O pedido continua sem resposta. O primeiro marco de ${input.clarificationReminderIntervalHours} horas ocorreu em ${firstReminderDueAt}. Isso indica apenas que um lembrete está devido; não prova que qualquer mensagem foi enviada, pois o canal ainda não foi definido.`
          : `Existe um pedido de esclarecimento sem resposta registrada pela cliente. O primeiro marco de lembrete é ${firstReminderDueAt}.`,
        href: `/admin/anamneses/${request.submissionId}/esclarecimentos`,
        id: `clarification:${request.id}`,
        kind: "clarification_without_response",
        statusLabel: firstReminderDue
          ? `Lembrete de ${input.clarificationReminderIntervalHours}h devido`
          : "Sem resposta",
        title: "Esclarecimento aguardando resposta",
      });
      continue;
    }

    items.push({
      clientId: request.clientId,
      clientLabel: request.clientLabel,
      createdAt: request.createdAt,
      description:
        "A cliente respondeu ao pedido de esclarecimento, mas a Patty ainda nao registrou a resolucao manual.",
      href: `/admin/anamneses/${request.submissionId}/esclarecimentos`,
      id: `clarification-review:${request.id}`,
      kind: "clarification_response_pending_review",
      statusLabel: "Resposta recebida",
      title: "Esclarecimento aguardando revisao da Patty",
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

  for (const feedback of input.weeklyFeedbacks ?? []) {
    if (feedback.submittedAt) {
      continue;
    }

    const dueAtPassed =
      feedback.dueAt !== null &&
      new Date(referenceNow).getTime() > new Date(feedback.dueAt).getTime();

    items.push({
      clientId: feedback.clientId,
      clientLabel: feedback.clientLabel,
      createdAt: feedback.createdAt,
      description: dueAtPassed
        ? `O Feedback Semanal referente a ${feedback.periodStart} ate ${feedback.periodEnd} continua sem envio final e o prazo informado (${feedback.dueAt}) ja passou. Isso nao aplica nenhuma consequencia automatica ao atendimento.`
        : `O Feedback Semanal referente a ${feedback.periodStart} ate ${feedback.periodEnd} foi solicitado e ainda nao possui envio final da cliente.`,
      href: `/admin/clientes/${feedback.clientId}/feedback-semanal`,
      id: `weekly-feedback:${feedback.id}`,
      kind: "weekly_feedback_awaiting_response",
      statusLabel: dueAtPassed ? "Prazo informado ultrapassado" : "Aguardando resposta",
      title: "Feedback Semanal aguardando cliente",
    });
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
