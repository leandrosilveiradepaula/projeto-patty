import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = fs.readFileSync(
  path.join(root, "app/admin/clientes/[clienteId]/anamnese/page.tsx"),
  "utf8",
);

test("admin anamnesis separates pending work from submitted history", () => {
  assert.match(page, /pendingSubmissions = submissions\.filter/);
  assert.match(page, /submittedSubmissions = submissions\.filter/);
  assert.match(page, /title="Aguardando cliente"/);
  assert.match(page, /title="Histórico enviado"/);
  assert.match(page, /Rascunhos da cliente não integram o histórico concluído/);
});

test("only submitted anamnesis exposes original answers as completed history", () => {
  const pendingStart = page.indexOf('title="Aguardando cliente"');
  const historyStart = page.indexOf('title="Histórico enviado"');
  const originalAnswers = page.indexOf("Ver respostas originais");

  assert.ok(pendingStart >= 0);
  assert.ok(historyStart > pendingStart);
  assert.ok(originalAnswers > historyStart);
});
