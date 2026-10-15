import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (pathName: string) => fs.readFileSync(path.join(root, pathName), "utf8");

test("published page resolves history only from current client publications", () => {
  const page = read("app/cliente/protocolo/page.tsx");
  assert.match(page, /listPublishedProtocolsForCurrentClient\(client\.id\)/);
  assert.match(page, /selectClientPublishedVersion\(publications \?\? \[\], publicacao\)/);
  assert.match(page, /publications\?\.find\(\(item\) => item\.id === selection\.selectedId\)/);
  assert.match(page, /selection\.invalidRequest/);
  assert.match(page, /selection\.isHistorical/);
  assert.doesNotMatch(page, /listAccessibleProtocolVersions|AdminProtocolDraftEditor|createAdminClient/);
});

test("cycle-to-variant links stay inside selected published version", () => {
  const page = read("app/cliente/protocolo/page.tsx");
  const nutrition = read("components/client/ClientProtocolNutrition.tsx");
  assert.match(page, /publishedVariationAnchor\(publication\.id, step\.variantId\)/);
  assert.match(page, /step\.targetExists/);
  assert.match(page, /publishedVariationAnchor\(publication\.id, variant\.id\)/);
  assert.match(nutrition, /id=\{variant\.anchorId\}/);
  assert.match(page, /sem atribuir automaticamente uma etapa à data de hoje/);
});

test("professional and published variant ordering use creation time instead of opaque keys", () => {
  const access = read("lib/supabase/data-access.ts");
  const professional = access.slice(access.indexOf("export async function listAccessibleProtocolVersionMealPlans"), access.indexOf("export type CurrentClientPublishedProtocol"));
  const client = access.slice(access.indexOf("export async function listPublishedProtocolsForCurrentClient"), access.indexOf("export async function hasAccessibleProtocolPublicationForClient"));
  assert.match(professional, /variants\.sort\(/);
  assert.match(professional, /comparePlanVariantRegistration\(left, right\)/);
  assert.match(client, /variants\.sort\(comparePlanVariantRegistration\)/);
  assert.doesNotMatch(professional, /order\("variant_key"/);
  assert.doesNotMatch(client, /order\("variant_key"/);
});


test("cycle step cannot resolve a variation from another published meal plan", () => {
  const access = read("lib/supabase/data-access.ts");
  const client = access.slice(access.indexOf("export async function listPublishedProtocolsForCurrentClient"),access.indexOf("export async function hasAccessibleProtocolPublicationForClient"));
  assert.match(client,/variant\.meal_plan_version_id !== mealPlan\.id/);
  assert.match(client,/variantsById\.get\(step\.variant_id\)/);
});
