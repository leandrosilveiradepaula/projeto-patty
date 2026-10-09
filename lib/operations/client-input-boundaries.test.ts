import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const checkins = read("app/cliente/checkins/actions.ts");
const training = read("app/cliente/treino/actions.ts");
const feedback = read("app/cliente/feedback-semanal/actions.ts");

test("client liquid correction requires a UUID before reading event history", () => {
  const section = checkins.slice(checkins.indexOf("export async function correctLiquidIntakeAction"), checkins.indexOf("export async function correctActivityCheckinAction"));
  assert.ok(section.indexOf("!isUuid(eventId)") >= 0);
  assert.ok(section.indexOf("!isUuid(eventId)") < section.indexOf("listAccessibleClientLiquidIntakeEvents"));
});

test("client activity correction requires a UUID before reading event history", () => {
  const section = checkins.slice(checkins.indexOf("export async function correctActivityCheckinAction"));
  assert.ok(section.indexOf("!isUuid(eventId)") >= 0);
  assert.ok(section.indexOf("!isUuid(eventId)") < section.indexOf("listAccessibleClientActivityCheckinEvents"));
});

test("client training requests reject file-valued notes", () => {
  assert.match(training, /rawNote !== null && typeof rawNote !== "string"/);
});

test("weekly feedback validates intent before fetching private feedback record", () => {
  assert.ok(feedback.indexOf('const intent = formData.get("intent")') < feedback.indexOf("getCurrentClientWeeklyFeedback(client.id, feedbackId)"));
});

test("client correction history date remains parsed on both correction journeys", () => {
  assert.equal(checkins.split("parseCheckinHistoryDay(formData.get("historyDay"), currentSaoPauloDate())").length - 1, 2);
});
