import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("client list can focus on clients with Patty actions", () => {
  const page = read("app/admin/clientes/page.tsx");
  assert.match(page, /view\?: string/);
  assert.match(page, /viewFilter = view === "patty" \? "patty" : "all"/);
  assert.match(page, /Com ação da Patty/);
  assert.match(page, /pattyPendingItemsByClientId\.has\(client\.id\)/);
});

test("pending queue keeps Patty actions primary and secondary groups collapsible", () => {
  const page = read("app/admin/pendencias/page.tsx");
  assert.match(page, /<h3>Ação da Patty<\/h3>/);
  assert.match(page, /className=\{styles\.collapsibleGroup\}/);
  assert.match(page, /<strong>Aguardando cliente<\/strong>/);
  assert.match(page, /<strong>Operacional do sistema<\/strong>/);
});

test("professional configuration catalog supports discovery without changing editors", () => {
  const page = read("app/admin/configuracoes/page.tsx");
  assert.match(page, /searchParams: Promise<\{ q\?: string; domain\?: string \}>/);
  assert.match(page, /filteredTemplates/);
  assert.match(page, /Todos os domínios/);
  assert.match(page, /updateMethodConfigurationAction/);
  assert.match(page, /updateWeeklyFeedbackScheduleAction/);
  assert.match(page, /updateAssessmentSchedulePreferencesAction/);
});
