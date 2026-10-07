export type OperationalPendingItemKind =
  | "ai_execution_started"
  | "anamnesis_draft"
  | "anamnesis_submitted_without_review"
  | "assessment_draft"
  | "clarification_response_pending_review"
  | "clarification_without_response"
  | "client_registration_missing"
  | "weekly_feedback_channel_missing"
  | "weekly_feedback_email_contact_missing"
  | "content_released_without_asset"
  | "private_file_pending_release"
  | "protocol_approved_not_published"
  | "protocol_submitted_not_approved"
  | "training_requested_without_plan"
  | "training_draft"
  | "training_reviewed_not_published"
  | "weekly_feedback_awaiting_response"
  | "weekly_feedback_reminder_blocked";

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


export type OperationalPendingGroup = "patty" | "client" | "operational";

const CLIENT_WAITING_PENDING_KINDS = new Set<OperationalPendingItemKind>([
  "anamnesis_draft",
  "clarification_without_response",
  "weekly_feedback_awaiting_response",
]);

const OPERATIONAL_PENDING_KINDS = new Set<OperationalPendingItemKind>([
  "ai_execution_started",
  "weekly_feedback_reminder_blocked",
  "content_released_without_asset",
]);

export function getOperationalPendingGroup(
  item: OperationalPendingItem,
): OperationalPendingGroup {
  if (CLIENT_WAITING_PENDING_KINDS.has(item.kind)) {
    return "client";
  }

  if (OPERATIONAL_PENDING_KINDS.has(item.kind)) {
    return "operational";
  }

  return "patty";
}

export function groupOperationalPendingItems(items: OperationalPendingItem[]) {
  return {
    patty: items.filter((item) => getOperationalPendingGroup(item) === "patty"),
    client: items.filter((item) => getOperationalPendingGroup(item) === "client"),
    operational: items.filter(
      (item) => getOperationalPendingGroup(item) === "operational",
    ),
  };
}

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

export type PendingTrainingLifecycle = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  id: string;
  state: "requested_without_plan" | "draft" | "reviewed_not_published";
  versionNumber: number | null;
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

export type PendingWeeklyFeedbackNotificationEvent = {
  blockedReason: string | null;
  channelKey: string | null;
  clientId: string;
  clientLabel: string;
  createdAt: string;
  deliveryState: string;
  eventKey: string;
  id: string;
  weeklyFeedbackId: string;
};

export type PendingClientOperationalReadiness = {
  clientId: string;
  clientLabel: string;
  contactEmail: string | null;
  createdAt: string;
  hasRegistration: boolean;
  weeklyFeedbackChannel: string | null;
};

export type PendingContentReleaseReadiness = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  hasAsset: boolean;
  releaseId: string;
  title: string;
  versionId: string;
};

export type PendingPrivateFileRelease = {
  clientId: string;
  clientLabel: string;
  createdAt: string;
  fileId: string;
  fileKind: string;
  originalFilename: string;
};

export type OperationalPendingFactsInput = {
  aiExecutions: PendingAiExecution[];
  anamnesisSubmissions: PendingAnamnesisSubmission[];
  assessments: PendingAssessment[];
  clarificationReminderIntervalHours: number;
  clarificationRequests: PendingClarificationRequest[];
  clientOperationalReadiness?: PendingClientOperationalReadiness[];
  contentReleaseReadiness?: PendingContentReleaseReadiness[];
  privateFileReleases?: PendingPrivateFileRelease[];
  protocolVersions: PendingProtocolVersion[];
  trainingLifecycle?: PendingTrainingLifecycle[];
  referenceNow?: string;
  weeklyFeedbackNotificationEvents?: PendingWeeklyFeedbackNotificationEvent[];
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

  for (const training of input.trainingLifecycle ?? []) {
    if (training.state === "requested_without_plan") {
      items.push({
        clientId: training.clientId,
        clientLabel: training.clientLabel,
        createdAt: training.createdAt,
        description:
          "Existe solicitação de treino registrada, mas nenhum plano de treino foi criado para esta cliente.",
        href: `/admin/clientes/${training.clientId}/treino`,
        id: `training-request:${training.id}`,
        kind: "training_requested_without_plan",
        statusLabel: "Solicitado, sem plano",
        title: "Treino solicitado",
      });
      continue;
    }

    if (training.state === "draft") {
      items.push({
        clientId: training.clientId,
        clientLabel: training.clientLabel,
        createdAt: training.createdAt,
        description: `A versão ${training.versionNumber ?? ""} do treino permanece em rascunho e ainda não foi revisada.`,
        href: `/admin/clientes/${training.clientId}/treino`,
        id: `training-draft:${training.id}`,
        kind: "training_draft",
        statusLabel: "Rascunho",
        title: "Treino em edição",
      });
      continue;
    }

    items.push({
      clientId: training.clientId,
      clientLabel: training.clientLabel,
      createdAt: training.createdAt,
      description: `A versão ${training.versionNumber ?? ""} do treino foi revisada, mas ainda não foi publicada para a cliente.`,
      href: `/admin/clientes/${training.clientId}/treino`,
      id: `training-publish:${training.id}`,
      kind: "training_reviewed_not_published",
      statusLabel: "Revisado, não publicado",
      title: "Treino aguardando publicação",
    });
  }

  for (const client of input.clientOperationalReadiness ?? []) {
    if (!client.hasRegistration) {
      items.push({
        clientId: client.clientId,
        clientLabel: client.clientLabel,
        createdAt: client.createdAt,
        description:
          "A cliente possui acompanhamento ativo, mas ainda não possui Cadastro Atual persistido. Complete os dados de contato antes de depender deles em fluxos operacionais.",
        href: `/admin/clientes/${client.clientId}#cadastro-atual`,
        id: `client-registration:${client.clientId}`,
        kind: "client_registration_missing",
        statusLabel: "Cadastro atual ausente",
        title: "Completar Cadastro Atual",
      });
    }

    if (!client.weeklyFeedbackChannel) {
      items.push({
        clientId: client.clientId,
        clientLabel: client.clientLabel,
        createdAt: client.createdAt,
        description:
          "Nenhum canal está configurado para o Feedback Semanal desta cliente. Escolha a preferência individual antes de depender do lembrete automático.",
        href: `/admin/clientes/${client.clientId}#preferencia-feedback`,
        id: `weekly-feedback-channel:${client.clientId}`,
        kind: "weekly_feedback_channel_missing",
        statusLabel: "Canal não configurado",
        title: "Configurar canal do Feedback Semanal",
      });
    } else if (
      client.weeklyFeedbackChannel === "email" &&
      !client.contactEmail?.trim()
    ) {
      items.push({
        clientId: client.clientId,
        clientLabel: client.clientLabel,
        createdAt: client.createdAt,
        description:
          "Email foi escolhido como canal do Feedback Semanal, mas o Cadastro Atual não possui email de contato. Email de login não é usado como substituto.",
        href: `/admin/clientes/${client.clientId}#cadastro-atual`,
        id: `weekly-feedback-email-contact:${client.clientId}`,
        kind: "weekly_feedback_email_contact_missing",
        statusLabel: "Email de contato ausente",
        title: "Completar contato para o Feedback Semanal",
      });
    }
  }

  for (const file of input.privateFileReleases ?? []) {
    items.push({
      clientId: file.clientId,
      clientLabel: file.clientLabel,
      createdAt: file.createdAt,
      description: `O arquivo "${file.originalFilename}" foi enviado administrativamente e permanece privado. Revise o arquivo e decida explicitamente se ele deve ser liberado para a cliente.`,
      href: `/admin/clientes/${file.clientId}/arquivos#aguardando-liberacao`,
      id: `private-file-release:${file.fileId}`,
      kind: "private_file_pending_release",
      statusLabel: "Aguardando liberação",
      title: "Revisar arquivo privado",
    });
  }

  for (const release of input.contentReleaseReadiness ?? []) {
    if (release.hasAsset) {
      continue;
    }

    items.push({
      clientId: release.clientId,
      clientLabel: release.clientLabel,
      createdAt: release.createdAt,
      description: `O conteúdo "${release.title}" foi liberado para a cliente, mas a versão exata ainda não possui asset privado registrado. A liberação permanece auditável, porém o arquivo não pode ser aberto.`,
      href: `/admin/clientes/${release.clientId}/conteudos#liberar-conteudo`,
      id: `content-release-asset:${release.releaseId}`,
      kind: "content_released_without_asset",
      statusLabel: "Liberado sem arquivo",
      title: "Conteúdo liberado sem asset",
    });
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
      href: `/admin/clientes/${feedback.clientId}/feedback-semanal#feedback-pendentes`,
      id: `weekly-feedback:${feedback.id}`,
      kind: "weekly_feedback_awaiting_response",
      statusLabel: dueAtPassed ? "Prazo informado ultrapassado" : "Aguardando resposta",
      title: "Feedback Semanal aguardando cliente",
    });
  }

  const latestReminderEventByFeedbackId = new Map<
    string,
    PendingWeeklyFeedbackNotificationEvent
  >();

  for (const event of input.weeklyFeedbackNotificationEvents ?? []) {
    if (
      !event.eventKey.startsWith("weekly_feedback_reminder:") &&
      !event.eventKey.startsWith("weekly_feedback_email_delivery:") &&
      !event.eventKey.startsWith("weekly_feedback_email_delivery_failed:")
    ) {
      continue;
    }

    const current = latestReminderEventByFeedbackId.get(event.weeklyFeedbackId);

    if (
      !current ||
      event.createdAt > current.createdAt ||
      (event.createdAt === current.createdAt && event.id > current.id)
    ) {
      latestReminderEventByFeedbackId.set(event.weeklyFeedbackId, event);
    }
  }

  const submittedFeedbackIds = new Set(
    (input.weeklyFeedbacks ?? [])
      .filter((feedback) => Boolean(feedback.submittedAt))
      .map((feedback) => feedback.id),
  );

  for (const event of latestReminderEventByFeedbackId.values()) {
    if (
      event.deliveryState === "delivered" ||
      event.deliveryState === "queued_external" ||
      submittedFeedbackIds.has(event.weeklyFeedbackId)
    ) {
      continue;
    }

    const statusLabel =
      event.deliveryState === "blocked_no_channel"
        ? "Canal não configurado"
        : event.deliveryState === "blocked_missing_contact"
          ? "Contato necessário ausente"
          : event.deliveryState === "delivery_failed"
            ? "Falha no envio por email"
            : "Provedor externo não configurado";

    const description =
      event.deliveryState === "blocked_no_channel"
        ? "O lembrete de quarta-feira foi devido, mas não existe canal configurado para esta cliente."
        : event.deliveryState === "blocked_missing_contact"
          ? `O lembrete de quarta-feira usa ${event.channelKey ?? "canal externo"}, mas o dado de contato necessário não está cadastrado.`
          : event.deliveryState === "delivery_failed"
            ? "Uma tentativa real de envio do lembrete por email falhou. O sistema preservou o histórico e poderá tentar novamente sem considerar a mensagem entregue."
            : `O canal ${event.channelKey ?? "externo"} está configurado, mas nenhum provedor de envio foi ativado. O sistema não considera a mensagem enviada.`;

    items.push({
      clientId: event.clientId,
      clientLabel: event.clientLabel,
      createdAt: event.createdAt,
      description,
      href: `/admin/clientes/${event.clientId}/feedback-semanal`,
      id: `weekly-feedback-reminder-blocked:${event.id}`,
      kind: "weekly_feedback_reminder_blocked",
      statusLabel,
      title: "Lembrete do Feedback Semanal não entregue",
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
