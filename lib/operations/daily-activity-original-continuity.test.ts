import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const page = read("app/cliente/checkins/page.tsx");
const actions = read("app/cliente/checkins/actions.ts");
const css = read("app/cliente/checkins/page.module.css");

test("today's first response is available only if no original record exists", () => {
  assert.ok(page.includes("const latestActivity = activityEvents[0] ?? null"));
  assert.ok(page.includes("{!latestActivity ? ("));
  assert.ok(page.includes("action={recordActivityCheckinAction}"));
  assert.ok(page.includes('name="didActivity" value="yes"'));
  assert.ok(page.includes('name="didActivity" value="no"'));
  assert.ok(page.includes('Você já registrou sua atividade de hoje'));
});

test("server validates the selected yes/no response before checking for duplication", () => {
  const validation = actions.indexOf('rawValue !== "yes" && rawValue !== "no"');
  const lookUp = actions.indexOf("recordedToday = (");
  const insert = actions.indexOf("await createCurrentClientActivityCheckinEvent({");
  assert.ok(validation > 0 && lookUp > validation && insert > lookUp);
  assert.ok(actions.includes('requireRole("client")'));
  assert.ok(actions.includes("getCurrentClient()"));
  assert.ok(actions.includes("listAccessibleClientActivityCheckinEvents(client.id, checkinDate)"));
});

test("server does not append another original after observing today's existing entry", () => {
  assert.ok(actions.includes("if (recordedToday) {"));
  assert.ok(actions.includes('redirect("/cliente/checkins?status=activity-already-recorded#atividade-fisica")'));
  assert.ok(actions.indexOf("if (recordedToday)") < actions.indexOf("createCurrentClientActivityCheckinEvent({"));
  assert.ok(!actions.includes('update("client_activity_checkin_events")'));
});

test("failed existing-record read does not fall through and create a new event", () => {
  assert.match(actions, /try \{\s*recordedToday = \(/);
  assert.ok(actions.includes('redirect("/cliente/checkins?status=activity-error")'));
  assert.ok(actions.includes("checkinDate,"));
  assert.ok(actions.includes("recordedByProfileId: auth.profileId"));
});

test("duplicate prevention is not misreported as a successful new activity write", () => {
  assert.ok(page.includes('status === "activity-already-recorded"'));
  assert.ok(page.includes('title="Atividade de hoje já registrada"'));
  assert.ok(page.includes("Nenhum novo registro foi criado."));
  assert.ok(page.includes("use Corrigir resposta de hoje"));
  assert.ok(actions.includes('redirect("/cliente/checkins?status=activity-recorded")'));
});

test("existing daily check-in uses historical correction, not another initial submission", () => {
  assert.ok(page.includes("latestActivity ? ("));
  assert.ok(page.includes("action={correctActivityCheckinAction}"));
  assert.ok(page.includes('id={`atividade-${latestActivity.id}`}'));
  assert.ok(page.includes('value={latestActivity.id}'));
  assert.ok(actions.includes("createAccessibleClientActivityCheckinEventCorrection({"));
  assert.ok(actions.includes("checkinDate: event.checkin_date"));
});

test("older same-day original records remain visible and individually correctable", () => {
  assert.ok(page.includes("activityEvents.length > 1"));
  assert.ok(page.includes("activityEvents.slice(1).map((event) =>"));
  assert.ok(page.includes('id={`atividade-${event.id}`}'));
  assert.ok(page.includes("latestActivityCorrectionByEvent.get(event.id)"));
  assert.ok(page.includes("corrected_did_activity ?? event.did_activity"));
  assert.ok(page.includes("Original: {event.did_activity"));
  assert.ok(page.includes('value={event.id}'));
  assert.ok(page.includes("Corrigir este registro anterior"));
});

test("legacy events are presented factually without deleting or merging history", () => {
  assert.ok(page.includes("Todas continuam preservadas"));
  assert.ok(page.includes("formatRecordedAt(event.recorded_at)"));
  assert.ok(page.includes("Data indisponível"));
  assert.ok(!page.includes("deleteAccessibleClientActivityCheckin"));
  assert.ok(!page.includes("mergeActivityCheckins"));
});

test("same-day corrections and historical filters retain their original IDs and access", () => {
  assert.ok(page.includes('selectedDay !== today'));
  assert.ok(page.includes('name="historyDay"'));
  assert.ok(page.includes('id={`atividade-${event.id}`}'));
  assert.ok(actions.includes('isUuid(eventId)'));
  assert.ok(actions.includes("const event = events.find((item) => item.id === eventId)"));
  assert.ok(actions.includes("revalidateCheckinJourneys(client.id)"));
});

test("mobile access to duplicate entries offers visible and focusable correction controls", () => {
  assert.ok(page.includes('aria-label="Outros registros de atividade de hoje"'));
  assert.ok(css.includes(".additionalActivityRecord"));
  assert.ok(css.includes("min-width: 0"));
  assert.ok(css.includes("@media (max-width: 640px)"));
  assert.ok(css.includes(".additionalActivity .activityActions > button"));
});

test("daily activity remains a factual record, not a clinical score or hydration target", () => {
  assert.ok(page.includes("O check-in é independente do treino prescrito"));
  assert.ok(page.includes("Esses registros não geram score automático de adesão"));
  assert.ok(page.includes("não aplica automaticamente uma meta diária"));
  assert.ok(!actions.includes("publishProtocolVersion"));
  assert.ok(!actions.includes("autoAdvancePhase"));
});
