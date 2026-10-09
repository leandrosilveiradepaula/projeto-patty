import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const journeys = [
  "anamnese", "avaliacoes", "evolucao", "protocolo", "feedback-semanal",
  "checkins", "treino", "conteudos", "arquivos",
];

test("nine actual client workspaces link to the shared continuity component", () => {
  for (const journey of journeys) {
    const source = readFileSync(`app/cliente/${journey}/page.tsx`, "utf8");
    assert.ok(source.includes('import { ClientJourneyNextSteps }'), journey);
    assert.ok(source.includes("<ClientJourneyNextSteps areas="), journey);
  }
});

test("shared links point only to existing care routes", () => {
  const source = readFileSync("components/client/ClientJourneyNextSteps.tsx", "utf8");
  for (const route of [
    "/cliente/anamnese", "/cliente/avaliacoes", "/cliente/evolucao",
    "/cliente/protocolo", "/cliente/feedback-semanal", "/cliente/checkins",
    "/cliente/treino", "/cliente/conteudos", "/cliente/arquivos", "/cliente/mais",
  ]) {
    assert.ok(source.includes(`href: "${route}"`), route);
  }
  assert.ok(!source.includes("/cliente/jornada"));
  assert.ok(!source.includes("/cliente/exercicios"));
});

test("shared journey links remain navigation only without automatic clinical actions", () => {
  const source = readFileSync("components/client/ClientJourneyNextSteps.tsx", "utf8");
  assert.ok(source.includes('import Link from "next/link"'));
  assert.ok(!source.includes('"use server"'));
  assert.ok(!source.includes("publish"));
});
