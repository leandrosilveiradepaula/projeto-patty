import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const client = read("app/cliente/feedback-semanal/page.tsx");
const admin = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
const dashboard = read("app/cliente/page.tsx");
const pending = read("lib/operations/pending.ts");
const disclosure = read("components/client/ClientHistoryDisclosure.tsx");

test("client primary action links to the exact pending feedback requested", () => {
  assert.ok(dashboard.includes("firstPendingClientWeeklyFeedback(weeklyFeedbacks)"));
  assert.ok(dashboard.includes("feedback-pendente-${firstPendingFeedback.id}"));
  assert.ok(client.includes('id={`feedback-pendente-${feedback.id}`}'));
});

test("older pending feedback opens its closed disclosure when targeted by the home link", () => {
  assert.ok(client.includes("<ClientHistoryDisclosure"));
  assert.ok(client.includes("defaultOpen={feedbackIndex === 0}"));
  assert.ok(disclosure.includes("defaultOpen = false"));
  assert.ok(disclosure.includes("<details className={className} id={id} open={defaultOpen}"));
  assert.ok(disclosure.includes("details.open = true"));
  assert.ok(disclosure.includes("window.addEventListener(\"hashchange\", revealTarget)"));
  assert.ok(disclosure.includes("document.getElementById(targetId)"));
});

test("multiple pending requests have keyboard-accessible week navigation", () => {
  assert.ok(client.includes("pendingFeedbacks.length > 1"));
  assert.ok(client.includes('aria-label="Ir para Feedback Semanal pendente"'));
  assert.ok(client.includes('href={`#feedback-pendente-${feedback.id}`}'));
  const css = read("app/cliente/feedback-semanal/page.module.css");
  assert.ok(css.includes(".feedbackNavigation a:focus-visible"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes("@media (max-width: 640px)"));
  assert.ok(css.includes(".pendingItem:target"));
});

test("historical client feedback can be opened by its stable ID without re-enabling edits", () => {
  assert.ok(client.includes('id={`feedback-enviado-${feedback.id}`}'));
  assert.ok(client.includes("submittedFeedbacks.map((feedback) =>"));
  assert.ok(client.includes("readWeeklyFeedbackAnswer(feedback.answers, question.key)"));
  assert.ok(!client.includes("saveWeeklyFeedbackAction.bind"));
});

test("Patty pending queue targets the actual request, not just a generic section", () => {
  assert.ok(pending.includes('feedback-semanal#feedback-pendente-${feedback.id}'));
  assert.ok(admin.includes('id={`feedback-pendente-${feedback.id}`}'));
  assert.ok(admin.includes('id="feedback-pendentes"'));
});

test("administrative requests and history share the client's factual weekly ordering", () => {
  assert.ok(admin.includes("orderClientWeeklyFeedbacks(feedbacks)"));
  assert.ok(admin.includes("orderedFeedbacks.filter("));
  assert.ok(admin.includes('id={`feedback-enviado-${feedback.id}`}'));
  assert.ok(admin.includes('href={`#feedback-pendente-${feedback.id}`}'));
  assert.ok(admin.includes('latestReminderEventByFeedback(notificationEvents)'));
  assert.ok(!admin.includes("publishedTrainingVersions"));
});

test("Patty queue links remain client-scoped and never send answers through a URL", () => {
  assert.ok(admin.includes("getAccessibleClient(clienteId)"));
  assert.ok(admin.includes("listAccessibleWeeklyFeedbacksForClient(client.id)"));
  assert.ok(client.includes("getCurrentClient()"));
  assert.ok(pending.includes("clientId: feedback.clientId"));
  assert.ok(!pending.includes("answers="));
  assert.ok(!disclosure.includes("localStorage"));
});

test("the professional confirmation and final client submission remain distinct", () => {
  const professional = read("components/admin/AdminWeeklyFeedbackRequestForm.tsx");
  const response = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackResponseForm.tsx");
  assert.ok(admin.includes("eligible={eligible}"));
  assert.ok(professional.includes("disabled={!eligible"));
  assert.ok(response.includes("saveWeeklyFeedbackAction.bind(null, feedbackId)"));
  assert.ok(response.includes("inFlightRef.current || isPending || submitted"));
  assert.ok(response.includes("state.outcome === \"submitted\""));
  assert.ok(!disclosure.includes("submit("));
});
