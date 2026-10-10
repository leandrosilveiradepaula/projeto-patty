import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { latestCheckinCorrectionsByEvent } from "../checkins/effective-corrections.ts";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const overview = read("app/admin/clientes/[clienteId]/page.tsx");
const history = read("app/admin/clientes/[clienteId]/checkins/page.tsx");

test("professional summary fetches correction for the selected client-scoped event", () => {
  assert.ok(overview.includes("listAccessibleClientActivityCheckinEvents(client.id)"));
  assert.ok(overview.includes("const latestActivity = activityEvents[0] ?? null"));
  assert.ok(overview.includes("listAccessibleClientActivityCheckinEventCorrections([latestActivity.id])"));
  assert.ok(overview.includes("latestCheckinCorrectionsByEvent(latestActivityCorrections).get(latestActivity.id)"));
  assert.ok(!overview.includes('latestActivity.did_activity ? "fez atividade"'));
});

test("professional activity summary reflects corrected false even if original was true", () => {
  const original = { id: "event-1", did_activity: true, checkin_date: "2026-10-09" };
  const corrections = [
    { id: "correction-1", event_id: original.id, created_at: "2026-10-09T10:00:00Z", corrected_did_activity: true, corrected_checkin_date: "2026-10-09" },
    { id: "correction-2", event_id: original.id, created_at: "2026-10-09T11:00:00Z", corrected_did_activity: false, corrected_checkin_date: "2026-10-09" },
  ];
  const latest = latestCheckinCorrectionsByEvent(corrections).get(original.id);
  const effective = latest?.corrected_did_activity ?? original.did_activity;
  assert.equal(effective, false);
  assert.ok(overview.includes("latestActivityCorrection?.corrected_did_activity ?? latestActivity?.did_activity"));
  assert.ok(overview.includes('effectiveDidActivity ? "fez atividade" : "não fez atividade"'));
});

test("professional summary shows historical correction marker only if it exists", () => {
  assert.ok(overview.includes('latestActivityCorrection ? " · resposta corrigida" : ""'));
  assert.ok(overview.includes("effectiveActivityDate"));
  assert.ok(overview.includes("latestActivityCorrection?.corrected_checkin_date ?? latestActivity?.checkin_date"));
  assert.ok(overview.includes('"Nenhum check-in de atividade registrado."'));
});

test("summary returns directly to the selected historical event, filtered by original day", () => {
  assert.ok(overview.includes("latestActivityHistoryHref"));
  assert.ok(overview.includes("latestActivity.checkin_date"));
  assert.ok(overview.includes('#atividade-${latestActivity.id}'));
  assert.ok(overview.includes('href={latestActivityHistoryHref}'));
  assert.ok(history.includes('id={`atividade-${event.id}`}'));
  assert.ok(history.includes("parseCheckinHistoryDay(dia, today)"));
  assert.ok(history.includes("listAccessibleClientActivityCheckinEvents(client.id, selectedDay ?? undefined)"));
});

test("professional check-in history distinguishes original and effective activity values", () => {
  assert.ok(history.includes("Original: {event.did_activity ?"));
  assert.ok(history.includes('A resposta efetiva é {effectiveDidActivity ? "Sim" : "Não"}'));
  assert.ok(history.includes("correction.corrected_checkin_date !== event.checkin_date"));
  assert.ok(history.includes("O filtro do histórico utiliza a data original"));
  assert.ok(history.includes("última correção") || history.includes("Última correção"));
});

test("an absent correction leaves the original answer unchanged", () => {
  const event = { id: "event-1", did_activity: false };
  const corrections: Array<{
    id: string;
    event_id: string;
    created_at: string;
    corrected_did_activity: boolean;
  }> = [];
  const correction = latestCheckinCorrectionsByEvent(corrections).get(event.id);
  assert.equal(correction?.corrected_did_activity ?? event.did_activity, false);
  assert.ok(overview.includes("const latestActivity = activityEvents[0] ?? null"));
});

test("invalid historical recording dates do not crash the professional check-in page", () => {
  assert.ok(history.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
  assert.ok(history.includes('timeZone: "America/Sao_Paulo"'));
  assert.ok(history.includes("formatDate(event.recorded_at)"));
  assert.ok(history.includes("formatDate(correction.created_at)"));
});

test("professional history keeps append-only correction authorization and originals", () => {
  const actions = read("app/admin/clientes/[clienteId]/checkins/actions.ts");
  assert.ok(actions.includes('requireRole("admin")'));
  assert.ok(actions.includes("getAccessibleClient(clientId)"));
  assert.ok(actions.includes("createAccessibleClientActivityCheckinEventCorrection({"));
  assert.ok(actions.includes('isUuid(eventId)'));
  assert.ok(history.includes("correction?.corrected_did_activity ?? event.did_activity"));
  assert.ok(!history.includes("deleteAccessibleClientActivityCheckinEvent"));
});

test("no activity result changes score, hydration target or professional phase", () => {
  assert.ok(!overview.includes("autoAdvancePhase"));
  assert.ok(!history.includes("applyHydrationFormula"));
  assert.ok(history.includes("sem meta automática"));
  assert.ok(overview.includes("Registros factuais"));
});
