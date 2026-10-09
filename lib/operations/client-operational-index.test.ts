import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync("app/cliente/mais/page.tsx", "utf8");
const dashboard = readFileSync("app/cliente/page.tsx", "utf8");

test("client care index exposes all ten core journeys and exercise library", () => {
  for (const href of [
    "/cliente/anamnese",
    "/cliente/avaliacoes",
    "/cliente/evolucao",
    "/cliente/conteudos",
    "/cliente/arquivos",
    "/cliente/treino",
    "/cliente/perfil",
    "/cliente/protocolo",
    "/cliente/checkins",
    "/cliente/feedback-semanal",
    "/cliente/exercicios",
  ]) {
    assert.ok(index.includes(`href: "${href}"`), `Missing client destination ${href}`);
  }
});

test("client care index links back to the real dashboard", () => {
  assert.ok(index.includes('href: "/cliente"'));
  assert.ok(dashboard.includes('href="/cliente/mais"'));
});

test("client care index does not expose the unapproved journey timeline", () => {
  assert.ok(!index.includes('href: "/cliente/jornada"'));
});
