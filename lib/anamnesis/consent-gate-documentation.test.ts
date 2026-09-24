import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const gatePath = join(process.cwd(), "docs", "ANAMNESE_CONSENT_GATE.md");

test("ANAM-046 documentation preserves the resolved MVP checkbox contract", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /DEFINIDO PARA O MVP/);
  assert.match(gate, /checkbox obrigatorio/i);
  assert.match(gate, /question_key = consent_acceptance/);
  assert.match(gate, /options = \["Concordo"\]/);
  assert.match(gate, /nao pode executar o envio final/i);
  assert.match(gate, /nao coletar IP, device fingerprint, localizacao/i);
});

test("ANAM-046 documentation keeps AI authorization separate", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /nao libera automaticamente/i);
  assert.match(gate, /OPENAI_HEALTH_DATA_PROCESSING_ENABLED/);
  assert.match(gate, /OPENAI_HEALTH_DATA_GATE\.md/);
  assert.match(gate, /publicacao continua explicita/i);
});
