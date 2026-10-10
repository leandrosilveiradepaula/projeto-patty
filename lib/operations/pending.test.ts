import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOperationalPendingItems,
  getOperationalPendingGroup,
  groupOperationalPendingItems,
} from "./pending.ts";

test("operational pending builder emits only explicit backend states", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    referenceNow: "2026-09-27T12:00:00Z",
    anamnesisSubmissions: [
      {
        id: "draft-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-20T10:00:00Z",
        submittedAt: null,
        reviewCount: 0,
      },
      {
        id: "submitted-1",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-21T10:00:00Z",
        submittedAt: "2026-09-22T10:00:00Z",
        reviewCount: 0,
      },
      {
        id: "reviewed-1",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-09-21T11:00:00Z",
        submittedAt: "2026-09-22T11:00:00Z",
        reviewCount: 1,
      },
    ],
    clarificationRequests: [
      {
        id: "clarification-1",
        submissionId: "submitted-1",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-23T10:00:00Z",
        responseCount: 0,
        resolved: false,
      },
      {
        id: "clarification-2",
        submissionId: "reviewed-1",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-09-23T11:00:00Z",
        responseCount: 1,
        resolved: false,
      },
      {
        id: "clarification-3",
        submissionId: "reviewed-1",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-09-23T12:00:00Z",
        responseCount: 1,
        resolved: true,
      },
    ],
    assessments: [
      {
        id: "assessment-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-24T10:00:00Z",
        finalizedAt: null,
      },
      {
        id: "assessment-2",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-24T11:00:00Z",
        finalizedAt: "2026-09-24T12:00:00Z",
      },
    ],
    protocolVersions: [
      {
        id: "version-1",
        protocolId: "protocol-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-25T09:00:00Z",
        submittedForReviewAt: "2026-09-25T10:00:00Z",
        versionNumber: 1,
        approvalCount: 0,
        publicationCount: 0,
      },
      {
        id: "version-2",
        protocolId: "protocol-2",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-25T11:00:00Z",
        submittedForReviewAt: "2026-09-25T12:00:00Z",
        versionNumber: 2,
        approvalCount: 1,
        publicationCount: 0,
      },
    ],
    aiExecutions: [
      {
        id: "ai-1",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-09-26T10:00:00Z",
        purposeKey: "anamnesis_review",
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    [
      "anamnesis_draft",
      "anamnesis_submitted_without_review",
      "clarification_without_response",
      "clarification_response_pending_review",
      "assessment_draft",
      "protocol_submitted_not_approved",
      "protocol_approved_not_published",
      "ai_execution_started",
    ],
  );

  const serialized = JSON.stringify(items).toLowerCase();
  for (const forbidden of [
    "baixa adesão",
    "atrasado",
    "prioridade alta",
    "diagnóstico",
    "estagnacao",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("operational pending builder excludes already resolved states", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [
      {
        id: "version-published",
        protocolId: "protocol-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-25T09:00:00Z",
        submittedForReviewAt: "2026-09-25T10:00:00Z",
        versionNumber: 1,
        approvalCount: 1,
        publicationCount: 1,
      },
    ],
    aiExecutions: [],
  });

  assert.deepEqual(items, []);
});

test("clarification reminder becomes factually due after 24 hours without response", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    referenceNow: "2026-09-24T10:00:00Z",
    anamnesisSubmissions: [],
    clarificationRequests: [
      {
        id: "clarification-due",
        submissionId: "submission-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-23T10:00:00Z",
        responseCount: 0,
        resolved: false,
      },
      {
        id: "clarification-not-due",
        submissionId: "submission-2",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-23T11:00:00Z",
        responseCount: 0,
        resolved: false,
      },
      {
        id: "clarification-answered",
        submissionId: "submission-3",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-09-20T10:00:00Z",
        responseCount: 1,
        resolved: false,
      },
    ],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
  });

  const due = items.find((item) => item.id === "clarification:clarification-due");
  const notDue = items.find(
    (item) => item.id === "clarification:clarification-not-due",
  );
  const answered = items.find(
    (item) => item.id === "clarification-review:clarification-answered",
  );

  assert.equal(due?.statusLabel, "Lembrete de 24h devido");
  assert.match(due?.description ?? "", /não prova que qualquer mensagem foi enviada/);
  assert.equal(notDue?.statusLabel, "Sem resposta");
  assert.equal(answered?.statusLabel, "Resposta recebida");
});

test("clarification reminder pending builder follows a changed configured interval", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 12,
    referenceNow: "2026-09-23T22:00:00Z",
    anamnesisSubmissions: [],
    clarificationRequests: [
      {
        id: "clarification-12h",
        submissionId: "submission-12h",
        clientId: "client-12h",
        clientLabel: "Cliente 12h",
        createdAt: "2026-09-23T10:00:00Z",
        responseCount: 0,
        resolved: false,
      },
    ],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.statusLabel, "Lembrete de 12h devido");
  assert.match(items[0]?.description ?? "", /marco de 12 horas/);
  assert.match(items[0]?.description ?? "", /2026-09-23T22:00:00.000Z/);
  assert.doesNotMatch(items[0]?.description ?? "", /24 horas/);
});


test("weekly feedback pending stays factual and never suspends service automatically", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    referenceNow: "2026-10-03T12:00:00Z",
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    weeklyFeedbacks: [
      {
        id: "feedback-open",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-09-29T10:00:00Z",
        dueAt: "2026-10-01T12:00:00Z",
        periodStart: "2026-09-22",
        periodEnd: "2026-09-28",
        submittedAt: null,
      },
      {
        id: "feedback-submitted",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-09-29T10:00:00Z",
        dueAt: "2026-10-01T12:00:00Z",
        periodStart: "2026-09-22",
        periodEnd: "2026-09-28",
        submittedAt: "2026-09-30T15:00:00Z",
      },
    ],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "weekly_feedback_awaiting_response");
  assert.equal(items[0]?.statusLabel, "Prazo informado ultrapassado");
  assert.equal(
    items[0]?.href,
    "/admin/clientes/client-1/feedback-semanal#feedback-pendente-feedback-1",
  );
  assert.match(
    items[0]?.description ?? "",
    /nao aplica nenhuma consequencia automatica ao atendimento/i,
  );
});


test("blocked weekly feedback reminder events become operational pendings", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    weeklyFeedbackNotificationEvents: [
      {
        id: "event-no-channel",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-10-07T12:00:00Z",
        weeklyFeedbackId: "feedback-1",
        channelKey: null,
        deliveryState: "blocked_no_channel",
        eventKey: "weekly_feedback_reminder:none",
        blockedReason: "channel_not_configured",
      },
      {
        id: "event-no-contact",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-10-07T12:01:00Z",
        weeklyFeedbackId: "feedback-2",
        channelKey: "email",
        deliveryState: "blocked_missing_contact",
        eventKey: "weekly_feedback_reminder:pref-email",
        blockedReason: "contact_email_missing",
      },
      {
        id: "event-no-provider",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-10-07T12:02:00Z",
        weeklyFeedbackId: "feedback-3",
        channelKey: "whatsapp",
        deliveryState: "blocked_provider",
        eventKey: "weekly_feedback_reminder:pref-whatsapp",
        blockedReason: "external_provider_not_configured",
      },
      {
        id: "event-delivered",
        clientId: "client-4",
        clientLabel: "Cliente 4",
        createdAt: "2026-10-07T12:03:00Z",
        weeklyFeedbackId: "feedback-4",
        channelKey: "in_app",
        deliveryState: "delivered",
        eventKey: "weekly_feedback_reminder:pref-app",
        blockedReason: null,
      },
    ],
  });

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => item.statusLabel),
    [
      "Canal não configurado",
      "Contato necessário ausente",
      "Provedor externo não configurado",
    ],
  );
  assert.equal(
    items.every((item) => item.kind === "weekly_feedback_reminder_blocked"),
    true,
  );
  assert.match(
    items[2]?.description ?? "",
    /não considera a mensagem enviada/i,
  );
});


test("latest delivered retry suppresses older blocked reminder pending", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    weeklyFeedbacks: [
      {
        id: "feedback-retry",
        clientId: "client-retry",
        clientLabel: "Cliente Retry",
        createdAt: "2026-10-05T11:00:00Z",
        dueAt: null,
        periodStart: "2026-09-28",
        periodEnd: "2026-10-04",
        submittedAt: null,
      },
    ],
    weeklyFeedbackNotificationEvents: [
      {
        id: "blocked-first",
        clientId: "client-retry",
        clientLabel: "Cliente Retry",
        createdAt: "2026-10-07T10:00:00Z",
        weeklyFeedbackId: "feedback-retry",
        channelKey: null,
        deliveryState: "blocked_no_channel",
        eventKey: "weekly_feedback_reminder:none",
        blockedReason: "channel_not_configured",
      },
      {
        id: "delivered-after",
        clientId: "client-retry",
        clientLabel: "Cliente Retry",
        createdAt: "2026-10-07T11:00:00Z",
        weeklyFeedbackId: "feedback-retry",
        channelKey: "in_app",
        deliveryState: "delivered",
        eventKey: "weekly_feedback_reminder:pref-app",
        blockedReason: null,
      },
    ],
  });

  assert.equal(
    items.some((item) => item.kind === "weekly_feedback_reminder_blocked"),
    false,
  );
});


test("queued email reminder is not treated as an operational failure", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    weeklyFeedbacks: [
      {
        id: "feedback-email-queued",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-19T11:00:00Z",
        dueAt: null,
        periodStart: "2026-10-12",
        periodEnd: "2026-10-18",
        submittedAt: null,
      },
    ],
    weeklyFeedbackNotificationEvents: [
      {
        id: "email-queued",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-21T12:00:00Z",
        weeklyFeedbackId: "feedback-email-queued",
        channelKey: "email",
        deliveryState: "queued_external",
        eventKey: "weekly_feedback_reminder:pref-email",
        blockedReason: "awaiting_external_delivery",
      },
    ],
  });

  assert.equal(
    items.some((item) => item.kind === "weekly_feedback_reminder_blocked"),
    false,
  );
});

test("failed email delivery becomes an operational pending until a later delivery succeeds", () => {
  const base = {
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    weeklyFeedbacks: [
      {
        id: "feedback-email-failed",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-19T11:00:00Z",
        dueAt: null,
        periodStart: "2026-10-12",
        periodEnd: "2026-10-18",
        submittedAt: null,
      },
    ],
  };

  const failed = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [
      {
        id: "email-source",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-21T12:00:00Z",
        weeklyFeedbackId: "feedback-email-failed",
        channelKey: "email",
        deliveryState: "queued_external",
        eventKey: "weekly_feedback_reminder:pref-email",
        blockedReason: "awaiting_external_delivery",
      },
      {
        id: "email-failed",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-21T12:05:00Z",
        weeklyFeedbackId: "feedback-email-failed",
        channelKey: "email",
        deliveryState: "delivery_failed",
        eventKey: "weekly_feedback_email_delivery_failed:attempt-1",
        blockedReason: "gmail_smtp_error",
      },
    ],
  });

  const failurePending = failed.find(
    (item) => item.kind === "weekly_feedback_reminder_blocked",
  );
  assert.equal(failurePending?.statusLabel, "Falha no envio por email");
  assert.match(failurePending?.description ?? "", /poderá tentar novamente/i);

  const delivered = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [
      {
        id: "email-failed",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-21T12:05:00Z",
        weeklyFeedbackId: "feedback-email-failed",
        channelKey: "email",
        deliveryState: "delivery_failed",
        eventKey: "weekly_feedback_email_delivery_failed:attempt-1",
        blockedReason: "gmail_smtp_error",
      },
      {
        id: "email-delivered",
        clientId: "client-email",
        clientLabel: "Cliente Email",
        createdAt: "2026-10-21T12:10:00Z",
        weeklyFeedbackId: "feedback-email-failed",
        channelKey: "email",
        deliveryState: "delivered",
        eventKey: "weekly_feedback_email_delivery:attempt-2",
        blockedReason: null,
      },
    ],
  });

  assert.equal(
    delivered.some(
      (item) => item.kind === "weekly_feedback_reminder_blocked",
    ),
    false,
  );
});


test("operational pending groups keep action ownership explicit", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    referenceNow: "2026-10-08T12:00:00Z",
    anamnesisSubmissions: [
      {
        id: "draft-client",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-10-01T10:00:00Z",
        submittedAt: null,
        reviewCount: 0,
      },
      {
        id: "review-patty",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-10-01T11:00:00Z",
        submittedAt: "2026-10-02T11:00:00Z",
        reviewCount: 0,
      },
    ],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [
      {
        id: "ai-operational",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-10-03T10:00:00Z",
        purposeKey: "anamnesis_review",
      },
    ],
  });

  const grouped = groupOperationalPendingItems(items);

  assert.deepEqual(
    grouped.patty.map((item) => item.kind),
    ["anamnesis_submitted_without_review"],
  );
  assert.deepEqual(
    grouped.client.map((item) => item.kind),
    ["anamnesis_draft"],
  );
  assert.deepEqual(
    grouped.operational.map((item) => item.kind),
    ["ai_execution_started"],
  );
});


test("training lifecycle facts become Patty operational pendings", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    trainingLifecycle: [
      {
        id: "request-1",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-10-07T10:00:00Z",
        state: "requested_without_plan",
        versionNumber: null,
      },
      {
        id: "version-draft",
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-10-07T10:10:00Z",
        state: "draft",
        versionNumber: 2,
      },
      {
        id: "version-reviewed",
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-10-07T10:20:00Z",
        state: "reviewed_not_published",
        versionNumber: 3,
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    [
      "training_requested_without_plan",
      "training_draft",
      "training_reviewed_not_published",
    ],
  );
  assert.equal(
    items.every((item) => getOperationalPendingGroup(item) === "patty"),
    true,
  );
  assert.deepEqual(
    items.map((item) => item.href),
    [
      "/admin/clientes/client-1/treino#solicitacao-treino",
      "/admin/clientes/client-2/treino#prescricao-treino",
      "/admin/clientes/client-3/treino#prescricao-treino",
    ],
  );
});


test("a training request after publication is a Patty follow-up, never automatic prescription", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    trainingLifecycle: [{
      clientId: "client-new-request",
      clientLabel: "Cliente",
      createdAt: "2026-10-08T13:00:00Z",
      id: "new-request",
      state: "requested_after_publication",
      versionNumber: 3,
    }],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "training_request_after_publication");
  assert.equal(items[0].id, "training-request-followup:new-request");
  assert.equal(items[0].href, "/admin/clientes/client-new-request/treino#solicitacao-treino");
  assert.equal(getOperationalPendingGroup(items[0]), "patty");
  assert.match(items[0].description, /decida manualmente/);
});

test("client readiness gaps become explicit Patty actions without using login email", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    clientOperationalReadiness: [
      {
        clientId: "client-registration",
        clientLabel: "Cliente Cadastro",
        contactEmail: null,
        createdAt: "2026-10-07T10:00:00Z",
        hasRegistration: false,
        weeklyFeedbackChannel: null,
      },
      {
        clientId: "client-email",
        clientLabel: "Cliente Email",
        contactEmail: null,
        createdAt: "2026-10-07T10:05:00Z",
        hasRegistration: true,
        weeklyFeedbackChannel: "email",
      },
      {
        clientId: "client-ready",
        clientLabel: "Cliente Pronta",
        contactEmail: "contato@example.test",
        createdAt: "2026-10-07T10:10:00Z",
        hasRegistration: true,
        weeklyFeedbackChannel: "email",
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => item.kind),
    [
      "client_registration_missing",
      "weekly_feedback_channel_missing",
      "weekly_feedback_email_contact_missing",
    ],
  );
  assert.equal(
    items.every((item) => getOperationalPendingGroup(item) === "patty"),
    true,
  );
  assert.match(
    items.find((item) => item.kind === "weekly_feedback_email_contact_missing")
      ?.description ?? "",
    /Email de login não é usado como substituto/,
  );
});

test("released content without an asset becomes an operational gap", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    contentReleaseReadiness: [
      {
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-10-07T11:00:00Z",
        hasAsset: false,
        releaseId: "release-missing",
        title: "Como utilizar a balança",
        versionId: "version-missing",
      },
      {
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-10-07T11:05:00Z",
        hasAsset: true,
        releaseId: "release-ready",
        title: "Conteúdo pronto",
        versionId: "version-ready",
      },
    ],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "content_released_without_asset");
  assert.equal(getOperationalPendingGroup(items[0]!), "operational");
  assert.equal(items[0]?.statusLabel, "Liberado sem arquivo");
  assert.match(items[0]?.description ?? "", /versão exata/);
});


test("operational readiness links land on the exact corrective workflow", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    clientOperationalReadiness: [
      {
        clientId: "client-channel",
        clientLabel: "Cliente Canal",
        contactEmail: null,
        createdAt: "2026-10-07T10:00:00Z",
        hasRegistration: true,
        weeklyFeedbackChannel: null,
      },
    ],
    contentReleaseReadiness: [
      {
        clientId: "client-content",
        clientLabel: "Cliente Conteúdo",
        createdAt: "2026-10-07T11:00:00Z",
        hasAsset: false,
        releaseId: "release-missing",
        title: "Conteúdo",
        versionId: "version-missing",
      },
    ],
  });

  assert.equal(
    items.find((item) => item.kind === "weekly_feedback_channel_missing")?.href,
    "/admin/clientes/client-channel#preferencia-feedback",
  );
  assert.equal(
    items.find((item) => item.kind === "content_released_without_asset")?.href,
    "/admin/clientes/client-content/conteudos#liberacao-release-missing",
  );
});


test("hidden administrative private files become explicit Patty release decisions", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
    privateFileReleases: [
      {
        clientId: "client-file",
        clientLabel: "Cliente Arquivo",
        createdAt: "2026-10-07T12:00:00Z",
        fileId: "file-hidden",
        fileKind: "exam",
        originalFilename: "exame.pdf",
      },
    ],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "private_file_pending_release");
  assert.equal(items[0]?.statusLabel, "Aguardando liberação");
  assert.equal(
    items[0]?.href,
    "/admin/clientes/client-file/arquivos#arquivo-pendente-file-hidden",
  );
  assert.equal(getOperationalPendingGroup(items[0]!), "patty");
  assert.match(items[0]?.description ?? "", /decida explicitamente/);
});




test("assessment draft pending stays factual and points to the real editor", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [
      {
        clientId: "client-assessment",
        clientLabel: "Cliente Avaliação",
        createdAt: "2026-10-07",
        finalizedAt: null,
        id: "assessment-draft",
      },
    ],
    protocolVersions: [],
    aiExecutions: [],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "assessment_draft");
  assert.equal(items[0]?.title, "Continuar avaliação");
  assert.equal(items[0]?.href, "/admin/avaliacoes/assessment-draft#coleta");
  assert.match(items[0]?.description ?? "", /finalize explicitamente/);
  assert.doesNotMatch(items[0]?.description ?? "", /atras|urg|prioridade/i);
});


test("weekly feedback delivery blockers point to the corrective surface", () => {
  const base = {
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [],
  };

  const noChannel = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [{
      blockedReason: "no_channel",
      channelKey: null,
      clientId: "client-feedback",
      clientLabel: "Cliente Feedback",
      createdAt: "2026-10-07T12:00:00Z",
      deliveryState: "blocked_no_channel",
      eventKey: "weekly_feedback_reminder:1",
      id: "event-no-channel",
      weeklyFeedbackId: "feedback-1",
    }],
  });
  assert.equal(
    noChannel[0]?.href,
    "/admin/clientes/client-feedback#preferencia-feedback",
  );

  const missingContact = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [{
      blockedReason: "missing_contact",
      channelKey: "email",
      clientId: "client-feedback",
      clientLabel: "Cliente Feedback",
      createdAt: "2026-10-07T12:00:00Z",
      deliveryState: "blocked_missing_contact",
      eventKey: "weekly_feedback_reminder:2",
      id: "event-missing-contact",
      weeklyFeedbackId: "feedback-2",
    }],
  });
  assert.equal(
    missingContact[0]?.href,
    "/admin/clientes/client-feedback#cadastro-atual",
  );

  const failedDelivery = buildOperationalPendingItems({
    ...base,
    weeklyFeedbackNotificationEvents: [{
      blockedReason: "smtp_failure",
      channelKey: "email",
      clientId: "client-feedback",
      clientLabel: "Cliente Feedback",
      createdAt: "2026-10-07T12:00:00Z",
      deliveryState: "delivery_failed",
      eventKey: "weekly_feedback_email_delivery_failed:3",
      id: "event-delivery-failed",
      weeklyFeedbackId: "feedback-3",
    }],
  });
  assert.equal(
    failedDelivery[0]?.href,
    "/admin/clientes/client-feedback/feedback-semanal#feedback-pendente-feedback-1",
  );
});


test("core Patty pendings deep-link to the exact review action", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [
      {
        id: "anamnesis-review",
        clientId: "client-1",
        clientLabel: "Cliente 1",
        createdAt: "2026-10-07T09:00:00Z",
        submittedAt: "2026-10-07T10:00:00Z",
        reviewCount: 0,
      },
    ],
    clarificationRequests: [
      {
        clientId: "client-2",
        clientLabel: "Cliente 2",
        createdAt: "2026-10-07T10:10:00Z",
        id: "clarification-review",
        responseCount: 1,
        resolved: false,
        submissionId: "anamnesis-2",
      },
    ],
    assessments: [],
    protocolVersions: [
      {
        approvalCount: 0,
        clientId: "client-3",
        clientLabel: "Cliente 3",
        createdAt: "2026-10-07T10:20:00Z",
        id: "protocol-version",
        protocolId: "protocol-1",
        publicationCount: 0,
        submittedForReviewAt: "2026-10-07T10:30:00Z",
        versionNumber: 4,
      },
    ],
    aiExecutions: [],
  });

  assert.equal(
    items.find((item) => item.kind === "anamnesis_submitted_without_review")?.href,
    "/admin/anamneses/anamnesis-review/revisao#nova-revisao",
  );
  assert.equal(
    items.find((item) => item.kind === "clarification_response_pending_review")?.href,
    "/admin/anamneses/anamnesis-2/esclarecimentos#esclarecimento-clarification-review",
  );
  assert.equal(
    items.find((item) => item.kind === "protocol_submitted_not_approved")?.href,
    "/admin/protocolos/protocol-1?versao=4#versao-4",
  );
});


test("nonterminal anamnesis AI execution deep-links to its source review", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [
      {
        anamnesisSubmissionId: "submission-ai",
        clientId: "client-ai",
        clientLabel: "Cliente IA",
        createdAt: "2026-10-07T18:00:00Z",
        id: "execution-ai",
        purposeKey: "anamnesis_review",
      },
    ],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "ai_execution_started");
  assert.equal(
    items[0]?.href,
    "/admin/anamneses/submission-ai/ia",
  );
});

test("non-anamnesis AI execution keeps the generic operations fallback", () => {
  const items = buildOperationalPendingItems({
    clarificationReminderIntervalHours: 24,
    anamnesisSubmissions: [],
    clarificationRequests: [],
    assessments: [],
    protocolVersions: [],
    aiExecutions: [
      {
        anamnesisSubmissionId: null,
        clientId: "client-ai",
        clientLabel: "Cliente IA",
        createdAt: "2026-10-07T18:05:00Z",
        id: "execution-generic",
        purposeKey: "future_assistive_analysis",
      },
    ],
  });

  assert.equal(items[0]?.href, "/admin/ia");
});

test("protocol drafts remain actionable alongside released and pending versions", () => {
  const shared = { clientId: "c", clientLabel: "Cliente", protocolId: "p" };
  const items = buildOperationalPendingItems({
    aiExecutions: [], anamnesisSubmissions: [], assessments: [],
    clarificationReminderIntervalHours: 24, clarificationRequests: [],
    protocolVersions: [
      { ...shared, id: "draft", createdAt: "2026-10-08T10:00:00Z", submittedForReviewAt: null, approvalCount: 0, publicationCount: 0, versionNumber: 4 },
      { ...shared, id: "released", createdAt: "2026-10-01T10:00:00Z", submittedForReviewAt: "2026-10-01T12:00:00Z", approvalCount: 1, publicationCount: 1, versionNumber: 3 },
      { ...shared, id: "approved", createdAt: "2026-09-28T10:00:00Z", submittedForReviewAt: "2026-09-28T12:00:00Z", approvalCount: 1, publicationCount: 0, versionNumber: 2 },
      { ...shared, id: "review", createdAt: "2026-09-26T10:00:00Z", submittedForReviewAt: "2026-09-26T12:00:00Z", approvalCount: 0, publicationCount: 0, versionNumber: 1 },
    ],
  });
  assert.deepEqual(new Set(items.map(item => item.kind)), new Set([
    "protocol_draft", "protocol_approved_not_published", "protocol_submitted_not_approved",
  ]));
  assert.equal(items.find(item => item.kind === "protocol_draft")?.href, "/admin/protocolos/p?versao=4#versao-4");
  assert.equal(items.find(item => item.kind === "protocol_approved_not_published")?.href, "/admin/protocolos/p?versao=2#versao-2");
  assert.equal(items.find(item => item.kind === "protocol_submitted_not_approved")?.href, "/admin/protocolos/p?versao=1#versao-1");
  assert.equal(getOperationalPendingGroup(items.find(item => item.kind === "protocol_draft")!), "patty");
});
