import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const access = readFileSync(new URL("../../lib/supabase/data-access.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../../app/admin/clientes/[clienteId]/treino/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../../app/cliente/treino/page.tsx", import.meta.url), "utf8");

function getFunction(name: string) {
  const start = access.indexOf("export async function " + name + "(");
  assert.ok(start >= 0, name);
  const end = access.indexOf("\nexport async function ", start + 20);
  return access.slice(start, end >= 0 ? end : undefined);
}

test("four training reads use authenticated paged requests and no privileged client", () => {
  for (const [name, table, filter] of [
    ["listAccessibleClientTrainingRequests", "client_training_requests", '.eq("client_id", clientId)'],
    ["listAccessibleClientTrainingPlanVersions", "client_training_plan_versions", '.eq("training_plan_id", trainingPlanId)'],
    ["listAccessibleClientTrainingPlanItems", "client_training_plan_items", '.eq("training_plan_version_id", trainingPlanVersionId)'],
    ["listExerciseVersionsVisibleToCurrentAdmin", "exercise_versions", '.from("exercise_versions")'],
  ]) {
    const source = getFunction(name);
    assert.match(source, /createClient\(\)/, name);
    assert.match(source, /collectTrainingPagedRows\(/, name);
    assert.match(source, /\.range\(from, to\)/, name);
    assert.ok(source.includes('.from("' + table + '")'), name);
    assert.ok(source.includes(filter), name);
    assert.doesNotMatch(source, /createAdminClient|service_role|SUPABASE_SECRET_KEY/, name);
  }
});

test("request pagination preserves its complete original note and immutable record identity", () => {
  const source = getFunction("listAccessibleClientTrainingRequests");
  for (const field of ["id", "client_id", "recorded_by_profile_id", "requested_at", "note", "created_at", "profiles(display_name)"]) {
    assert.ok(source.includes(field), field);
  }
  assert.match(source, /Date\.parse\(left\.requested_at\)/);
  assert.match(source, /Date\.parse\(right\.requested_at\)/);
});

test("version and draft items preserve version identity, position and safe order", () => {
  const versions = getFunction("listAccessibleClientTrainingPlanVersions");
  const items = getFunction("listAccessibleClientTrainingPlanItems");
  for (const field of ["published_at", "reviewed_at", "created_by_profile_id", "published_by_profile_id"]) {
    assert.ok(versions.includes(field), field);
  }
  for (const field of ["exercise_version_id", "execution_notes", "position", "sets_text", "repetitions_text"]) {
    assert.ok(items.includes(field), field);
  }
  assert.match(versions, /right\.version_number - left\.version_number/);
  assert.match(items, /left\.position - right\.position/);
});

test("published training remains a per-client version-specific RLS read", () => {
  const source = getFunction("listAccessibleClientTrainingPlanItemsForVersions");
  assert.match(source, /collectTrainingHistoryRows\(/);
  assert.match(source, /\.in\("training_plan_version_id", ids\)/);
  assert.match(source, /\.range\(from, to\)/);
  assert.match(client, /publishedTrainingVersions\(trainingVersions\)/);
  assert.match(admin, /publishedTrainingVersions\(versions\)/);
  assert.doesNotMatch(client, /listExerciseVersionsVisibleToCurrentAdmin/);
});

test("professional catalog pagination retains published-only selector and user-visible version", () => {
  const source = getFunction("listExerciseVersionsVisibleToCurrentAdmin");
  assert.match(source, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(source, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /Date\.parse\(left\.created_at\)/);
  assert.match(admin, /Boolean\(exercise\.published_at\)/);
  assert.match(admin, /orderPublishedExerciseOptions\(/);
  assert.match(admin, /versionNumber: exercise\.version_number/);
});
