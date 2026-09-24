import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mvp = readFileSync(join(process.cwd(), "docs", "MVP.md"), "utf8");

test("MVP operational handoff does not regress to the pre-apply Anamnesis state", () => {
  const staleClaims = [
    "Estado operacional do MVP em 2026-09-23",
    "ainda precisa ser aplicada no SaaS antes de repetir o smoke de rascunho",
    "submissao final da Anamnese ainda nao esta implementada",
    "o `master` esta a frente do deployment de producao da Vercel por limite de builds",
    "etapas posteriores ao Cutting 2;",
  ];

  for (const claim of staleClaims) {
    assert.equal(mvp.includes(claim), false, `stale MVP claim found: ${claim}`);
  }
});

test("MVP operational handoff points to the current Anamnesis publication gate", () => {
  assert.match(mvp, /20260924142453_anamnesis_final_submission_foundation/);
  assert.match(mvp, /ANAMNESE_CONSENT_GATE\.md/);
  assert.match(mvp, /Cutting 3 Linear/);
  assert.match(mvp, /deployment de producao `READY`/);
});
