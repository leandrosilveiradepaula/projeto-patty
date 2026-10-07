import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("check-in runtime writes corrections instead of mutating original events", () => {
  const dataAccess = read("lib/supabase/data-access.ts");
  const clientActions = read("app/cliente/checkins/actions.ts");
  const adminActions = read("app/admin/clientes/[clienteId]/checkins/actions.ts");

  assert.match(dataAccess, /client_liquid_intake_event_corrections/);
  assert.match(dataAccess, /client_activity_checkin_event_corrections/);
  assert.match(dataAccess, /createAccessibleClientLiquidIntakeEventCorrection/);
  assert.match(dataAccess, /createAccessibleClientActivityCheckinEventCorrection/);
  assert.doesNotMatch(clientActions, /\.from\("client_liquid_intake_events"\)\s*\.update/);
  assert.doesNotMatch(adminActions, /\.from\("client_activity_checkin_events"\)\s*\.update/);
});

test("client and admin check-in pages expose effective corrected values and original history", () => {
  const clientPage = read("app/cliente/checkins/page.tsx");
  const adminPage = read("app/admin/clientes/[clienteId]/checkins/page.tsx");

  assert.match(clientPage, /Histórico de líquidos/);
  assert.match(clientPage, /Original:/);
  assert.match(clientPage, /Corrigir resposta de hoje/);
  assert.match(adminPage, /Corrigir registro/);
  assert.match(adminPage, /Corrigir resposta/);
  assert.match(adminPage, /Original:/);
});
