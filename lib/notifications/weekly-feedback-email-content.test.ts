import assert from "node:assert/strict";
import test from "node:test";

import { buildWeeklyFeedbackEmailContent } from "./weekly-feedback-email-content.ts";

const appOrigin = "https://example.invalid";

test("reminder uses only the stated period and authenticated application URL", () => {
  const content = buildWeeklyFeedbackEmailContent({
    appOrigin,
    periodStart: "2026-10-05",
    periodEnd: "2026-10-11",
  });
  assert.equal(content.subject, "Lembrete do seu Feedback Semanal");
  assert.match(content.bodyText, /05\/10\/2026 a 11\/10\/2026/);
  assert.match(content.bodyText, /https:\/\/example\.invalid\/cliente\/feedback-semanal/);
  assert.doesNotMatch(content.bodyText, /resposta|dosagem|adesão|meta diária/i);
  assert.match(content.bodyText, /Consultoria Corpo & Mente/);
  assert.doesNotMatch(content.bodyText, /\bPatty\b|Projeto Patty/);
});

test("a malformed or reversed period fails before any SMTP attempt", () => {
  for (const [periodStart, periodEnd] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-12-01", "2026-13-01"],
    ["2026-10-12", "2026-10-11"],
    ["", "2026-10-11"],
  ]) {
    assert.throws(() => buildWeeklyFeedbackEmailContent({
      appOrigin, periodStart, periodEnd,
    }), /Invalid weekly feedback period/);
  }
});

test("leap calendar days remain valid and unchanged", () => {
  const content = buildWeeklyFeedbackEmailContent({
    appOrigin,
    periodStart: "2024-02-26",
    periodEnd: "2024-02-29",
  });
  assert.match(content.bodyText, /26\/02\/2024 a 29\/02\/2024/);
});
