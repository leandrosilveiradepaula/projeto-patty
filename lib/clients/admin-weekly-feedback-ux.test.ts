import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin weekly feedback separates pending work from submitted history", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");

  assert.match(page, /title="Pendentes"/);
  assert.match(page, /title="Histórico enviado"/);
  assert.match(page, /pendingFeedbacks\.map/);
  assert.match(page, /submittedFeedbacks\.map/);
  assert.match(page, /<details className=\{styles\.historyItem\}>/);
});


test("weekly feedback admin page exposes stable operational anchors", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");

  assert.match(page, /id="solicitar-feedback"/);
  assert.match(page, /id="feedback-pendentes"/);
});


test("weekly feedback copy reflects the implemented recurring schedule", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");

  assert.match(page, /A agenda automática gera as solicitações elegíveis/);
  assert.doesNotMatch(page, /termina de ser parametrizada/);
});
