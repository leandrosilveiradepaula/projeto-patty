import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("client history reads a selected activity day without changing today's record", () => {
  const page = read("app/cliente/checkins/page.tsx");
  assert.match(page, /listAccessibleClientActivityCheckinEvents\(client\.id, today\)/);
  assert.match(page, /listAccessibleClientActivityCheckinEvents\(client\.id, selectedDay\)/);
  assert.match(page, /historicalActivityEvents\)\.map\(event/);
  assert.match(page, /exploredActivities\.total === 0/);
  assert.match(page, /latestActivityCorrectionByEvent\.get\(event\.id\)/);
  assert.match(page, /name="historyDay" type="hidden" value=\{selectedDay\}/);
  assert.match(page, /correctActivityCheckinAction/);
});

test("admin Check-ins date filter also applies to activity history", () => {
  const page = read("app/admin/clientes/[clienteId]/checkins/page.tsx");
  assert.match(page, /listAccessibleClientActivityCheckinEvents\(client\.id, selectedDay \?\? undefined\)/);
  assert.match(page, /const recentActivityEvents = activityEvents;/);
  assert.match(page, /exploreActivityCheckins\(effectiveActivityEvents/);
  assert.match(page, /name="historyDay" type="hidden" value=\{selectedDay\}/);
});

test("both correction actions derive an authorized return day and enforce safe millilitres", () => {
  for (const file of ["app/cliente/checkins/actions.ts", "app/admin/clientes/[clienteId]/checkins/actions.ts"]) {
    const source = read(file);
    assert.match(source, /parsePositiveCheckinMl\(rawAmount\)/);
    assert.match(source, /authorizedCorrectionHistoryDay\(kind, event, formData\.get\("historyDay"\)/);
    assert.doesNotMatch(source, /Number\.parseInt\(rawAmount/);
  }
});
