import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client overview avoids repeating operational areas as shortcut cards", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");

  const shortcutsStart = page.indexOf('title="Atalhos complementares"');
  const shortcutsEnd = page.indexOf('title="Cadastro atual"', shortcutsStart);
  const shortcuts = page.slice(shortcutsStart, shortcutsEnd);

  assert.ok(shortcutsStart > -1);
  assert.match(shortcuts, />Evolução</);
  assert.match(shortcuts, />Arquivos</);
  assert.match(shortcuts, />Conteúdos</);
  assert.match(shortcuts, />Check-ins</);
  assert.match(shortcuts, />Treino</);

  assert.doesNotMatch(shortcuts, />Anamnese</);
  assert.doesNotMatch(shortcuts, />Avaliações</);
  assert.doesNotMatch(shortcuts, />Protocolos</);
  assert.doesNotMatch(shortcuts, />Feedback semanal</);
});

test("training remains complementary instead of becoming a linear journey step", () => {
  const page = read("app/admin/clientes/[clienteId]/page.tsx");

  const journeyStart = page.indexOf('title="Fluxo do atendimento"');
  const journeyEnd = page.indexOf('title="Atalhos complementares"', journeyStart);
  const journey = page.slice(journeyStart, journeyEnd);

  assert.doesNotMatch(journey, /<h3[^>]*>Treino<\/h3>/);
  assert.match(page, /label: "Complementares"/);
});
