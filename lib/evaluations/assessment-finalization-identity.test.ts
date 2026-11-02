import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const persistence = readFileSync("lib/evaluations/assessment-persistence.ts", "utf8");
const actions = readFileSync("app/admin/avaliacoes/[avaliacaoId]/actions.ts", "utf8");
const auth = readFileSync("lib/supabase/auth.ts", "utf8");

test("privileged assessment finalization rechecks admin identity before creating service-role client", () => {
  assert.match(persistence, /import \{ requireRole \} from "@\/lib\/supabase\/auth"/);
  const role = persistence.indexOf('const context = await requireRole("admin")');
  const identity = persistence.indexOf("context.profileId !== input.finalizedByProfileId");
  const privileged = persistence.indexOf("const supabase = createAdminClient()");
  assert.ok(role >= 0 && identity > role && privileged > identity);
  assert.match(persistence.slice(identity, privileged), /throw new Error/);
});

test("finalization action keeps human confirmation and passes the authenticated profile", () => {
  assert.match(actions, /const context = await requireRole\("admin"\)/);
  assert.match(actions, /formData\.get\("confirmFinalization"\) !== "yes"/);
  assert.match(actions, /finalizedByProfileId: context\.profileId/);
  assert.match(actions, /readiness\.canFinalizeDeterministically/);
  assert.match(auth, /assurance\.currentLevel !== "aal2"/);
});
