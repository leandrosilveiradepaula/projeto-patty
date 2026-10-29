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
  assert.match(page, /pendingPage\.items\.map/);
  assert.match(page, /submittedPage\.items\.map/);
  assert.match(page, /<details className=\{styles\.historyItem\} id=/);
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


test("J2 prioritizes received and pending records before exceptional manual request", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(page, /rawSubmittedCount > 0 \|\| rawPendingCount > 0/);
  assert.match(page, /Etapas do Feedback Semanal/);
  assert.match(page, /Primeiro consulte as respostas recebidas/);
  assert.match(page, /Nenhum feedback registrado/);
  const opened = page.indexOf('      {rawSubmittedCount > 0 || rawPendingCount > 0 ? <>');
  const received = page.indexOf('<div id="feedback-enviados">', opened);
  const pending = page.indexOf('<div id="feedback-pendentes">', opened);
  const request = page.indexOf('id="solicitar-feedback"', opened);
  assert.ok(opened >= 0 && received > opened && pending > received && request > pending,
    "existing records should be consulted before initiating another request");
});
