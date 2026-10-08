import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("contents empty state preserves professional release", () => {
  const page = read("app/cliente/conteudos/page.tsx");
  assert.match(page, /liberações dependem de uma decisão profissional/);
  assert.match(page, /Voltar ao início/);
});

test("anamnesis empty state checks availability", () => {
  const page = read("app/cliente/anamnese/page.tsx");
  assert.match(page, /startAvailability.available/);
  assert.match(page, /nem formulário disponível/);
});

test("feedback empty state explains absence of request", () => {
  const page = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(page, /Ainda não existe um Feedback Semanal disponível/);
});

test("training empty state points to real form only without request", () => {
  const page = read("app/cliente/treino/page.tsx");
  assert.match(page, /requests.length === 0/);
  assert.match(page, /id="solicitar-treino"/);
  assert.match(page, /href="#solicitar-treino"/);
});
