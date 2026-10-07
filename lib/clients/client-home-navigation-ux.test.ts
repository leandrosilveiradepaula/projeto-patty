import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("client home focuses on next action instead of duplicating the full area catalog", () => {
  const page = read("app/cliente/page.tsx");

  assert.match(page, /title="O que fazer agora"/);
  assert.doesNotMatch(page, /title="Seu acompanhamento"/);
  assert.doesNotMatch(page, /listCurrentClientContentReleases/);
  assert.doesNotMatch(page, /listCurrentClientFinalizedAssessmentMeasurements/);
  assert.doesNotMatch(page, /listCurrentClientFiles/);
  assert.doesNotMatch(page, /listAccessibleClientTrainingRequests/);
});

test("client More page remains the catalog of secondary areas and describes current training behavior", () => {
  const page = read("app/cliente/mais/page.tsx");

  assert.match(page, /title="Outras áreas"/);
  assert.match(page, /Consulte seu treino publicado ou solicite o serviço de treino/);
  assert.match(page, /href: "\/cliente\/treino"/);
});

test("legacy exercises route goes straight to the published-training workspace", () => {
  const page = read("app/cliente/exercicios/page.tsx");

  assert.match(page, /redirect\("\/cliente\/treino"\)/);
  assert.doesNotMatch(page, /biblioteca completa de exercícios/);
});

test("More stays active for secondary deep links", () => {
  const nav = read("components/layout/ClientBottomNav.tsx");

  assert.match(nav, /"\/cliente\/exercicios"/);
  assert.match(nav, /"\/cliente\/jornada"/);
});
