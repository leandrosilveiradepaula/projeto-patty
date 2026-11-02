import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("app/admin/avaliacoes/[avaliacaoId]/actions.ts", "utf8");

test("admin assessment access errors do not incorrectly imply active assignment is mandatory", () => {
  assert.match(actions, /Esta avaliação não está disponível para sua sessão administrativa/);
  assert.doesNotMatch(actions, /Esta avaliação não está acessível para sua atribuição atual/);
  assert.match(actions, /const assessment = isUuid\(assessmentId\) \? await getAccessibleClientAssessment\(assessmentId\) : null/);
  assert.match(actions, /await requireRole\("admin"\)/);
});

test("finalization still requires human confirmation and server-side readiness", () => {
  assert.match(actions, /formData\.get\("confirmFinalization"\) !== "yes"/);
  assert.match(actions, /readiness\.canFinalizeDeterministically/);
  assert.match(actions, /finalizeAssessmentWithMethodSnapshot\(/);
});
