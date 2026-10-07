import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("client lifecycle remains separate from profile status and Auth", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");
  assert.match(questions, /clients\.status.*fonte do estado profissional de acompanhamento/s);
  assert.match(questions, /profiles\.status.*nao deve ser usado para representar acompanhamento/s);
  assert.match(questions, /cliente inativa nao equivale a conta Auth desativada/);
});

test("invite parser support is not documented as resend or expiration policy", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");
  assert.match(questions, /parser de convite.*suporte tecnico ao fluxo, nao politica de expiracao\/reenvio/s);
});

test("reengagement remains privacy gated", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");
  assert.match(questions, /reengajamento nao autoriza listar dados clinicos\/sensiveis/);
  assert.match(questions, /base legal\/consentimento, canal, escopo minimo de dados/);
});

test("historical Drive labels cannot become content taxonomies implicitly", () => {
  const library = read("docs/CONTENT_LIBRARY.md");
  assert.match(library, /categorias derivadas de nomes de pastas\/arquivos.*apenas hipoteses de triagem/s);
  assert.match(library, /TREINO FEMININO.*nao sao taxonomia de produto/s);
});

test("clarification reminders cannot inherit weekly feedback channel preference", () => {
  const readiness = read("docs/MVP_READINESS.md");
  assert.match(readiness, /weekly_feedback.*nao deve ser reutilizada automaticamente para esclarecimentos/s);
  assert.match(readiness, /purposes distintos/);
});
