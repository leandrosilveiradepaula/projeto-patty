import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { describeWeeklyFeedbackReminderEvidence } from "./weekly-feedback-reminder-presentation.ts";

test("manual requests without an event do not claim a scheduled reminder is pending", () => {
  const manual = describeWeeklyFeedbackReminderEvidence("manual", null);
  assert.equal(manual.label, "Solicitação manual — lembrete automático não programado.");
  assert.equal(manual.nextStep, undefined);
  const scheduled = describeWeeklyFeedbackReminderEvidence("schedule", undefined);
  assert.equal(scheduled.label, "Nenhum evento de lembrete registrado.");
  assert.equal(scheduled.nextStep, undefined);
  const unknown = describeWeeklyFeedbackReminderEvidence("legacy", null);
  assert.match(unknown.label, /Origem não identificada/);
  assert.doesNotMatch(unknown.label, /Manual|Automática/);
});

test("actual recorded event takes precedence even for a historical manual request", () => {
  assert.equal(describeWeeklyFeedbackReminderEvidence("manual", {
    channel_key: "in_app", delivery_state: "delivered",
  }).label, "Último evento registrado: Lembrete disponível no app");
});

test("blocked event is historical and still offers the existing remediation link", () => {
  const noChannel = describeWeeklyFeedbackReminderEvidence("schedule", {
    channel_key: null, delivery_state: "blocked_no_channel",
  });
  assert.match(noChannel.label, /^Último evento registrado:/);
  assert.match(noChannel.label, /canal não configurado/);
  assert.equal(noChannel.nextStep?.anchor, "preferencia-feedback");
  const contact = describeWeeklyFeedbackReminderEvidence("schedule", {
    channel_key: "email", delivery_state: "blocked_missing_contact",
  });
  assert.equal(contact.nextStep?.anchor, "cadastro-atual");
});

test("SMTP acceptance never implies that the client received, read or answered", () => {
  const email = describeWeeklyFeedbackReminderEvidence("schedule", {
    channel_key: "email", delivery_state: "delivered",
  });
  assert.match(email.label, /recebimento do email não confirmado/);
  assert.doesNotMatch(email.label, /lido|respondido|revisado|adesão/i);
});

test("both professional views reuse the source-aware display and keep inbox return through filters", () => {
  const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
  const inbox = read("app/admin/feedback-semanal/page.tsx");
  const detail = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(inbox, /describeWeeklyFeedbackReminderEvidence\(feedback\.request_source, reminderByFeedback\.get\(feedback\.id\)\)/);
  assert.match(detail, /describeWeeklyFeedbackReminderEvidence\(feedback\.request_source, reminderEvent\)/);
  assert.match(detail, /weeklyFeedbackOriginLabel\(feedback\.request_source\)/);
  assert.doesNotMatch(detail, /feedback\.request_source === "schedule" \? "Automática" : "Manual"/);
  assert.match(detail, /name="caixaRetorno" value=\{inboxReturn\}/);
  assert.match(detail, /withWeeklyFeedbackInboxReturn\(\s*withPendingQueueReturn\(/);
  assert.match(detail, /inboxReturn \?\? "\/admin\/feedback-semanal"/);
});
