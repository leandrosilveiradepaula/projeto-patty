import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { authorizedCorrectionHistoryDay } from "./correction-return-day.ts";

const today = "2026-10-12";
test("liquid return day uses the original authorized instant in Sao Paulo", () => {
  assert.equal(authorizedCorrectionHistoryDay("liquido", { recorded_at: "2026-10-12T01:30:00Z" }, "2026-10-12", today), "2026-10-11");
  assert.equal(authorizedCorrectionHistoryDay("liquido", { recorded_at: "2026-10-12T10:30:00Z" }, "2026-10-11", today), "2026-10-12");
});
test("activity return day uses authorized check-in date", () => {
  assert.equal(authorizedCorrectionHistoryDay("atividade", { checkin_date: "2026-10-09" }, "2026-10-11", today), "2026-10-09");
});
test("missing or invalid events use only a validated fallback", () => {
  assert.equal(authorizedCorrectionHistoryDay("liquido", null, "2026-10-08", today), "2026-10-08");
  assert.equal(authorizedCorrectionHistoryDay("atividade", null, "2026-10-13", today), null);
  assert.equal(authorizedCorrectionHistoryDay("liquido", { recorded_at: "invalid" }, "2026-10-10", today), "2026-10-10");
  assert.equal(authorizedCorrectionHistoryDay("atividade", { checkin_date: "2026-02-31" }, "2026-10-10", today), "2026-10-10");
});
test("both server correction journeys resolve the canonical day after authorized event lookup", () => {
  for (const area of ["app/cliente/checkins", "app/admin/clientes/[clienteId]/checkins"]) {
    const source = readFileSync(new URL("../../" + area + "/actions.ts", import.meta.url), "utf8");
    assert.match(source, /authorizedCorrectionHistoryDay\(kind, event,/);
    assert.match(source, /getAccessibleClientLiquidIntakeEvent/);
    assert.match(source, /getAccessibleClientActivityCheckinEvent/);
  }
});
test("client activity summary anchors differ from paged history anchors", () => {
  const source = readFileSync(new URL("../../app/cliente/checkins/page.tsx", import.meta.url), "utf8");
  assert.match(source, /atividade-atual-\$\{latestActivity.id\}/);
  assert.match(source, /atividade-resumo-\$\{event.id\}/);
  assert.match(source, /<li id=\{\x60atividade-\$\{event.id\}\x60\}/);
});
