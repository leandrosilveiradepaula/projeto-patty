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

test("client check-in history distinguishes past consultation from today's recording", () => {
  const source = readFileSync("app/cliente/checkins/page.tsx", "utf8");
  assert.ok(source.includes("const totalMl = displayedLiquidEvents.reduce("));
  assert.ok(source.includes("const waterMl = displayedLiquidEvents"));
  assert.ok(source.includes("invalidHistoryDay"));
  assert.ok(source.includes("Voltar para os registros de hoje"));
  assert.ok(source.includes("A resposta de hoje fica disponível"));
});

test("training requests refresh persisted history and exercise positions retain order", () => {
  const form = readFileSync("components/client/ClientTrainingRequestForm.tsx", "utf8");
  const page = readFileSync("app/cliente/treino/page.tsx", "utf8");
  assert.ok(form.includes("router.refresh()"));
  assert.ok(page.includes("a.position - b.position"));
  assert.ok(page.includes("publishedTrainingVersions(trainingVersions)"));
});

test("private upload validates size, resets file selection on category change and omits private error payloads", () => {
  const form = readFileSync("components/client/ClientPrivateFileUploadForm.tsx", "utf8");
  const preflight = readFileSync("lib/files/private-file-upload-selection.ts", "utf8");
  const validator = readFileSync("lib/validation/private-files.ts", "utf8");
  assert.ok(form.includes("validatePrivateFileUploadSelection("));
  assert.ok(preflight.includes("validatePrivateFile({"));
  assert.ok(validator.includes("input.byteSize > PRIVATE_FILE_LIMITS_BYTES[input.fileKind]"));
  assert.ok(form.includes('input[name="file"]'));
  assert.ok(!form.includes('console.error("Private file temporary upload failed", uploadError)'));
  assert.ok(!form.includes('console.error("Private file upload flow failed", error)'));
});

test("check-in correction errors preserve the selected history date", () => {
  const actions = readFileSync("app/cliente/checkins/actions.ts", "utf8");
  assert.ok(actions.includes('checkinHistorySearch(day)'));
  assert.ok(actions.includes('correctionRedirect("correction-error", formData)'));
  assert.ok(actions.includes('correctionRedirect("correction-invalid", formData)'));
});
