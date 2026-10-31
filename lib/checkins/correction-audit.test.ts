import assert from "node:assert/strict";
import test from "node:test";
import {
  activityCorrectionChangesValue,
  effectiveActivityCheckinDate,
  checkinCorrectionAuthor,
  checkinCorrectionSnapshotMatches,
  compareCheckinCorrectionsChronologically,
  formatCheckinAuditDate,
  groupCheckinCorrectionHistory,
  liquidCorrectionChangesValue,
  parseExpectedCheckinCorrectionId,
} from "./correction-audit.ts";

const u1 = "11111111-1111-4111-8111-111111111111";
const u2 = "22222222-2222-4222-8222-222222222222";

const rows = [
  { id: "z", event_id: "liquid", created_at: "2026-10-09T13:00:00-03:00", corrected_by_profile_id: u1 },
  { id: "c", event_id: "activity", created_at: "2026-10-09T10:00:00Z", corrected_by_profile_id: u1 },
  { id: "a", event_id: "liquid", created_at: "2026-10-09T09:00:00Z", corrected_by_profile_id: u2 },
  { id: "b", event_id: "liquid", created_at: "2026-10-09T11:00:00-03:00", corrected_by_profile_id: u1 },
];

test("correction audit groups all events and sorts by actual absolute instants, not input order", () => {
  const input = [...rows];
  for (const source of [rows, [...rows].reverse()]) {
    const groups = groupCheckinCorrectionHistory(source);
    assert.deepEqual(groups.get("liquid")?.map((v) => v.id), ["a", "b", "z"]);
    assert.deepEqual(groups.get("activity")?.map((v) => v.id), ["c"]);
  }
  assert.deepEqual(rows, input);
  assert.equal(groupCheckinCorrectionHistory([]).size, 0);
});

test("ambiguous or legacy invalid dates have deterministic order", () => {
  const invalid = { id: "a", event_id: "a", created_at: "invalid", corrected_by_profile_id: u1 };
  const valid = { id: "b", event_id: "a", created_at: "2026-10-11T07:00:00Z", corrected_by_profile_id: u1 };
  assert.ok(compareCheckinCorrectionsChronologically(invalid, valid) < 0);
  assert.equal(formatCheckinAuditDate("legacy"), "Data indisponível");
  assert.match(formatCheckinAuditDate("2026-10-11T07:00:00Z"), /11\/10\/2026/);
  assert.ok(compareCheckinCorrectionsChronologically(invalid, { ...invalid, id: "b" }) < 0);
});

test("hidden correction snapshot accepts empty original or a UUID, never malformed input", () => {
  assert.deepEqual(parseExpectedCheckinCorrectionId(""), { valid: true, id: null });
  assert.deepEqual(parseExpectedCheckinCorrectionId(u1), { valid: true, id: u1 });
  for (const value of [null, "garbage", "undefined", "null", ["a"], "0"]) {
    assert.deepEqual(parseExpectedCheckinCorrectionId(value as never), { valid: false });
  }
  assert.equal(checkinCorrectionSnapshotMatches(null, null), true);
  assert.equal(checkinCorrectionSnapshotMatches(u1, { id: u1 }), true);
  assert.equal(checkinCorrectionSnapshotMatches(null, { id: u1 }), false);
  assert.equal(checkinCorrectionSnapshotMatches(u1, { id: u2 }), false);
  assert.equal(checkinCorrectionSnapshotMatches(u1, null), false);
});

test("no-op checks compare the effective last correction rather than original-only values", () => {
  const liquid = { amount_ml: 150, liquid_kind: "water" };
  assert.equal(liquidCorrectionChangesValue(liquid, null, 150, "water"), false);
  assert.equal(liquidCorrectionChangesValue(liquid, null, 200, "water"), true);
  assert.equal(liquidCorrectionChangesValue(liquid, { corrected_amount_ml: 200, corrected_liquid_kind: "tea" }, 200, "tea"), false);
  assert.equal(liquidCorrectionChangesValue(liquid, { corrected_amount_ml: 200, corrected_liquid_kind: "tea" }, 150, "water"), true);
  const activity = { checkin_date: "2026-10-01", did_activity: true };
  assert.equal(activityCorrectionChangesValue(activity, null, "2026-10-01", true), false);
  assert.equal(activityCorrectionChangesValue(activity, null, "2026-10-01", false), true);
  assert.equal(activityCorrectionChangesValue(activity, { corrected_checkin_date: "2026-10-02", corrected_did_activity: false }, "2026-10-02", false), false);
});

test("display author category without identifiers or guessing when no linked client profile exists", () => {
  assert.equal(checkinCorrectionAuthor(u1, u1), "Cliente");
  assert.equal(checkinCorrectionAuthor(u2, u1), "Profissional responsável");
  assert.equal(checkinCorrectionAuthor(u1, null), "Autoria não identificada");
});

test("changing activity answer preserves the latest corrected day, not the original day", () => {
  const original = { checkin_date: "2026-10-01", did_activity: true };
  const correction = { corrected_checkin_date: "2026-10-02", corrected_did_activity: false };
  const effectiveDate = effectiveActivityCheckinDate(original, correction);
  assert.equal(effectiveDate, "2026-10-02");
  assert.equal(activityCorrectionChangesValue(original, correction, effectiveDate, true), true);
  assert.equal(activityCorrectionChangesValue(original, correction, effectiveDate, false), false);
  // A second append-only correction changes only the answer, never the day.
  const next = { corrected_checkin_date: effectiveDate, corrected_did_activity: true };
  assert.equal(effectiveActivityCheckinDate(original, next), "2026-10-02");
  assert.equal(activityCorrectionChangesValue(original, next, effectiveActivityCheckinDate(original, next), true), false);
  assert.equal(effectiveActivityCheckinDate(original, null), "2026-10-01");
  assert.equal(effectiveActivityCheckinDate(original, undefined), "2026-10-01");
});
