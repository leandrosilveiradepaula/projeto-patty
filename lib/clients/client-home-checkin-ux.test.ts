import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client home does not treat liquid intake as a required daily pending action", () => {
  const page = read("app/cliente/page.tsx");

  assert.match(page, /const hasPendingDailyCheckin = !hasActivityCheckinToday/);
  assert.match(page, /O registro de líquidos continua disponível em Check-ins, sem meta automática/);
  assert.doesNotMatch(page, /listAccessibleClientLiquidIntakeEvents/);
  assert.doesNotMatch(page, /hasLiquidCheckinToday/);
});
