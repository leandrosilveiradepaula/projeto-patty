import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const gatePath = join(process.cwd(), "docs", "ANAMNESE_CONSENT_GATE.md");

test("ANAM-046 consent gate preserves the external-decision boundary", () => {
  const gate = readFileSync(gatePath, "utf8");

  const requiredSections = [
    "Texto juridico oficial",
    "Identificacao de versao",
    "Base legal e finalidade",
    "Efeito da nao concordancia",
    "Revogacao ou retirada",
    "Retencao do registro de aceite",
    "Evidencia tecnica minima do aceite",
    "Reconsentimento",
    "Relacao com dados sensiveis e IA",
  ];

  for (const section of requiredSections) {
    assert.match(gate, new RegExp(section));
  }

  assert.match(gate, /nao redige texto juridico/i);
  assert.match(gate, /NAO PUBLICAR/);
  assert.match(gate, /nao assumir.*autoriza envio de dados para IA/is);
});

test("ANAM-046 gate requires documentation before implementation", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /DECISIONS\.md/);
  assert.match(gate, /OPEN_QUESTIONS\.md/);
  assert.match(gate, /Somente depois:/);
  assert.match(gate, /publicar explicitamente/);
});
