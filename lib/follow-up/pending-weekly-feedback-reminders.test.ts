import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { describeAdminFeedbackReminder } from "../operations/admin-feedback-reminder.ts";
import {
  latestVisiblePendingReminderEvents,
  type PendingFeedbackReminderEvent,
  type VisiblePendingFeedback,
} from "./pending-weekly-feedback-reminders.ts";

const pending = (id: string, client_id: string, submitted_at: string | null = null): VisiblePendingFeedback =>
  ({ id, client_id, submitted_at });

const event = (
  id: string, weekly_feedback_id: string, client_id: string,
  delivery_state: string, channel_key: string | null, created_at: string,
  event_key = "weekly_feedback_reminder:" + id,
): PendingFeedbackReminderEvent => ({
  id, weekly_feedback_id, client_id, delivery_state, channel_key, created_at, event_key,
});

test("only same-client, still-pending feedbacks on current page show reminder events", () => {
  const visible = [pending("week-a", "client-a"), pending("submitted", "client-a", "2026-10-15T10:00:00Z")];
  const events = [
    event("not-visible", "other-week", "client-a", "blocked_no_channel", null, "2026-10-15T14:00:00Z"),
    event("other-client", "week-a", "client-b", "blocked_provider", "whatsapp", "2026-10-15T13:00:00Z"),
    event("sent", "submitted", "client-a", "delivered", "email", "2026-10-15T12:00:00Z"),
    event("own", "week-a", "client-a", "blocked_no_channel", null, "2026-10-15T11:00:00Z"),
  ];
  const selected = latestVisiblePendingReminderEvents(visible, events);
  assert.deepEqual([...selected.keys()], ["week-a"]);
  assert.equal(selected.get("week-a")?.id, "own");
  assert.equal(latestVisiblePendingReminderEvents([], events).size, 0);
});

test("latest delivery event wins by timestamp; unrelated event types cannot override", () => {
  const records = [
    event("older", "week-a", "client-a", "blocked_no_channel", null, "2026-10-14T12:00:00Z"),
    event("irrelevant", "week-a", "client-a", "blocked_provider", "whatsapp", "2026-10-16T14:00:00Z", "unrelated:event"),
    event("latest", "week-a", "client-a", "delivered", "email", "2026-10-15T10:00:00-03:00", "weekly_feedback_email_delivery:latest"),
  ];
  const selected = latestVisiblePendingReminderEvents([pending("week-a", "client-a")], records);
  assert.equal(selected.get("week-a")?.id, "latest");
  assert.match(describeAdminFeedbackReminder(selected.get("week-a"))?.label ?? "", /recebimento do email não confirmado/);
  assert.equal(records[0].id, "older");
});

test("blocked delivery offers existing links; missing event does not suggest a failure", () => {
  assert.equal(describeAdminFeedbackReminder(event(
    "no-channel", "week", "client", "blocked_no_channel", null, "2026-10-15T10:00:00Z",
  ))?.nextStep?.anchor, "preferencia-feedback");
  assert.equal(describeAdminFeedbackReminder(event(
    "contact", "week", "client", "blocked_missing_contact", "email", "2026-10-15T10:00:00Z",
  ))?.nextStep?.anchor, "cadastro-atual");
  assert.equal(describeAdminFeedbackReminder(undefined), null);
});

test("reminder query is metadata-only, RLS-scoped and bounded by visible page", () => {
  const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
  const loader = read("lib/follow-up/pending-weekly-feedback-reminder-loader.ts");
  const page = read("app/admin/feedback-semanal/page.tsx");
  assert.match(loader, /createClient\(\)/);
  assert.match(loader, /collectScopedClientOperationalRows\(clientIds/);
  assert.match(loader, /pending\.length > RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE/);
  assert.match(loader, /\.in\("client_id", ids\)/);
  assert.match(loader, /\.in\("weekly_feedback_id", feedbackIds\)/);
  assert.match(loader, /\.select\("id, client_id, weekly_feedback_id, event_key, channel_key, delivery_state, created_at"\)/);
  // Match actual PostgREST column lists, not explanatory source comments.
  // Every projection must stay metadata-only; adding a second sensitive
  // select must fail this test even when the first one remains unchanged.
  const projections = [...loader.matchAll(/\\.select\\("([^"]+)"\\)/g)].map((match) => match[1]);
  assert.deepEqual(projections, [
    "id, client_id, weekly_feedback_id, event_key, channel_key, delivery_state, created_at",
  ]);
  assert.doesNotMatch(loader, /service_role|createAdminClient/);
  assert.match(page, /listReminderEventsForVisiblePendingFeedbacks\(pendingResults\.items\)/);
  assert.match(page, /latestVisiblePendingReminderEvents\(pendingResults\.items, reminderEvents\)/);
  assert.match(page, /Nenhum evento de lembrete registrado/);
});
