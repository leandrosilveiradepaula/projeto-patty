import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const access = read("lib/supabase/data-access.ts");
const detail = read("app/admin/exercicios/[exerciseId]/page.tsx");
const listing = read("app/admin/exercicios/page.tsx");
const creation = read("components/admin/AdminExerciseCreateForm.tsx");

test("professional version history is complete, ordered and RLS scoped", () => {
  const begin = access.indexOf("export async function listExerciseVersionsForCurrentAdmin(");
  const end = access.indexOf("\nexport async function ", begin + 25);
  const code = access.slice(begin, end);
  assert.match(code, /createClient\(\)/);
  assert.match(code, /collectTrainingPagedRows\(/);
  assert.match(code, /\.eq\("exercise_id", exerciseId\)/);
  assert.match(code, /\.range\(from, to\)/);
  assert.match(code, /right\.version_number - left\.version_number/);
  assert.doesNotMatch(code, /createAdminClient|service_role/);
});

test("catalog creation keeps server redirect and blocks rapid duplicate submissions", () => {
  assert.match(listing, /<AdminExerciseCreateForm/);
  assert.match(creation, /action=\{createExerciseAction\}/);
  assert.match(creation, /inFlight\.current = true/);
  assert.match(creation, /event\.preventDefault\(\)/);
  assert.match(creation, /aria-busy=\{pending\}/);
  assert.match(creation, /disabled=\{pending\}/);
  assert.match(creation, /required/);
});

test("legacy timestamps cannot crash historical exercise pages", () => {
  assert.match(listing, /Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(detail, /Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(detail, /Data indisponível/);
});

test("exercise library never automatically distributes catalog entries to clients", () => {
  assert.match(listing, /treinos individuais e publicados/);
  assert.match(detail, /findSingleDraftExerciseVersion\(versions\)/);
  assert.doesNotMatch(creation, /publishAccessibleExerciseVersion|assignExerciseToClient/);
});
