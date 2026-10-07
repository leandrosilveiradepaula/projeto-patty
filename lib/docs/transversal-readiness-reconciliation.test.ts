import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("PWA documentation reflects merged master state", () => {
  const pwa = read("docs/PWA_INSTALLATION.md");
  assert.match(pwa, /fundação PWA já está mergeada no `master`/);
  assert.doesNotMatch(pwa, /branch `codex\/installable-pwa`/);
});

test("SMTP operational documentation no longer frames the current system as MVP", () => {
  const smtp = read("docs/GMAIL_SMTP_SETUP.md");
  assert.match(smtp, /^# Gmail SMTP - estado operacional/m);
  assert.doesNotMatch(smtp, /^# Gmail SMTP no MVP/m);
});

test("future role question is not mislabeled as post-MVP", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");
  assert.match(questions, /### QUESTAO ABERTA FUTURA/);
  assert.doesNotMatch(questions, /### QUESTAO ABERTA POS-MVP/);
});

test("Drive review keeps non-approved content outside bulk migration", () => {
  const drive = read("docs/DRIVE_CONTENT_INVENTORY_REVIEW.md");
  assert.match(drive, /primeiro item aprovado pode seguir apenas pelo lote controlado/);
  assert.match(drive, /Nao iniciar migracao fisica em lote ainda/);
});

test("health data gate remains closed for real client data", () => {
  const gate = read("docs/OPENAI_HEALTH_DATA_GATE.md");
  assert.match(gate, /Status: \*\*NAO LIBERADO PARA DADOS REAIS\*\*/);
  assert.match(gate, /escolha de producao continua sujeita ao gate vigente/);
});
