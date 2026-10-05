import assert from "node:assert/strict";
import test from "node:test";

import { buildOperationalPendingItems } from "./pending.ts";

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
    "/admin/clientes/client-1/feedback-semanal",
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
