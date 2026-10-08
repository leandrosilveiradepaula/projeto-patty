import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataAccess = fs.readFileSync(path.join(root, "lib/supabase/data-access.ts"), "utf8");
const actions = fs.readFileSync(path.join(root, "app/admin/protocolos/[protocoloId]/actions.ts"), "utf8");

function functionSource(source: string, name: string): string {
  const start = source.indexOf("export async function " + name + "(");
  assert.ok(start >= 0, name + " should exist");
  const next = source.indexOf("export async function ", start + 1);
  return source.slice(start, next >= 0 ? next : undefined);
}

test("draft dose deletion requires a returned row and refuses silent zero-row success", () => {
  const code = functionSource(dataAccess, "deleteAccessibleMealDoseAllocation");
  assert.match(code, /\.delete\(\)\s*\.eq\("id", doseAllocationId\)\s*\.select\("id"\)\s*\.maybeSingle\(\)/);
  assert.match(code, /if \(!data\)\s*\{\s*throw new Error\(/);
  const action = functionSource(actions, "removeProtocolMealDose");
  assert.match(action, /await deleteAccessibleMealDoseAllocation\(doseAllocationId\)/);
  assert.match(action, /catch\s*\{/);
});

test("empty meal deletion only reports success when a row was removed", () => {
  const code = functionSource(dataAccess, "deleteAccessibleEmptyMeal");
  assert.match(code, /\.select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(code, /if \(\(count \?\? 0\) > 0\)\s*\{\s*return false;/);
  assert.match(code, /\.eq\("id", input\.mealId\)\s*\.eq\("meal_plan_variant_id", input\.variantId\)\s*\.select\("id"\)\s*\.maybeSingle\(\)/);
  assert.match(code, /return Boolean\(data\);/);
  const action = functionSource(actions, "removeProtocolMeal");
  assert.match(action, /if \(!removed\)\s*\{\s*return\s*\{/);
});

test("empty variant deletion only reports success when a row was removed", () => {
  const code = functionSource(dataAccess, "deleteAccessibleEmptyMealPlanVariant");
  assert.match(code, /\.select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(code, /if \(\(count \?\? 0\) > 0\)\s*\{\s*return false;/);
  assert.match(code, /\.eq\("id", input\.variantId\)\s*\.eq\("meal_plan_version_id", input\.mealPlanVersionId\)\s*\.select\("id"\)\s*\.maybeSingle\(\)/);
  assert.match(code, /return Boolean\(data\);/);
  const action = functionSource(actions, "removeProtocolMealPlanVariant");
  assert.match(action, /if \(!removed\)\s*\{\s*return\s*\{/);
});

test("unconfirmed empty deletions instruct Patty to check the current draft", () => {
  assert.match(actions, /A refeição não foi removida\. Ela pode ter sido alterada ou excluída em outra aba/);
  assert.match(actions, /A variação não foi removida\. Ela pode ter sido alterada ou excluída em outra aba/);
});
