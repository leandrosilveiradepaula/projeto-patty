import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  collectPublishedProtocolRows,
  PUBLISHED_PROTOCOL_ID_BATCH_SIZE,
  PUBLISHED_PROTOCOL_PAGE_SIZE,
} from "../protocol/published-read-pagination.ts";

const read = (p: string) =>
  readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const access = read("lib/supabase/data-access.ts");
const admin = read("app/admin/protocolos/[protocoloId]/page.tsx");
const listing = read("app/admin/clientes/[clienteId]/protocolos/page.tsx");
const client = read("app/cliente/protocolo/page.tsx");

const section = (start: string, end: string) =>
  access.slice(access.indexOf("export async function " + start), access.indexOf("export async function " + end));

test("the professional protocol record only uses the RLS-bound Supabase client", () => {
  const code = section("listAccessibleProtocolVersions(", "submitAccessibleProtocolVersionForReview(");
  assert.ok(code.includes("createClient()"));
  assert.ok(!code.includes("createAdminClient"));
  assert.ok(!code.includes("service_role"));
  assert.ok(!code.includes("SUPABASE_SERVICE_ROLE_KEY"));
});

test("single and multi-protocol version histories exhaust page limits", () => {
  for (const name of ["listAccessibleProtocolVersions(", "listAccessibleProtocolVersionsForProtocols("]) {
    const code = section(name, name.startsWith("listAccessibleProtocolVersions(")
      ? "listAccessibleProtocolVersionsForProtocols(" : "cloneAccessibleProtocolVersionDraft(");
    assert.ok(code.includes("collectPublishedProtocolRows("), name);
    assert.ok(code.includes('.in("protocol_id", ids)'), name);
    assert.ok(code.includes(".range(from, to)"), name);
    assert.ok(code.includes('right.version_number - left.version_number'), name);
  }
});

test("approvals and publications use paginated client-scoped version IDs", () => {
  for (const [start, end, table] of [
    ["listAccessibleProtocolVersionApprovals(", "listAccessibleProtocolPublications(", "protocol_version_approvals"],
    ["listAccessibleProtocolPublications(", "submitAccessibleProtocolVersionForReview(", "protocol_publications"],
  ]) {
    const code = section(start, end);
    assert.ok(code.includes("collectPublishedProtocolRows("), table);
    assert.ok(code.includes('.in("protocol_version_id", ids)'), table);
    assert.ok(code.includes('.from("' + table + '")'), table);
    assert.ok(code.includes(".range(from, to)"), table);
    assert.ok(code.includes("left.id.localeCompare(right.id)"), table);
  }
});

test("all six levels of professional meal snapshots use paginated, bounded ID reads", () => {
  const code = section("listAccessibleProtocolVersionMealPlans(", "listPublishedProtocolsForCurrentClient(");
  for (const table of [
    "meal_plan_versions", "meal_plan_variants", "meal_plan_cycles",
    "meals", "meal_plan_cycle_steps", "meal_dose_allocations",
  ]) {
    assert.ok(code.includes('.from("' + table + '")'), table);
  }
  assert.equal((code.match(/collectPublishedProtocolRows\(/g) ?? []).length, 6);
  assert.equal((code.match(/\.range\(from, to\)/g) ?? []).length, 6);
  assert.ok(code.includes("if (planIds.length === 0)"));
  assert.ok(code.includes("if (protocolVersionIds.length === 0)"));
});

test("meal rows are sorted globally before building nested version-specific lists", () => {
  const code = section("listAccessibleProtocolVersionMealPlans(", "listPublishedProtocolsForCurrentClient(");
  assert.ok(code.indexOf("variants.sort(") < code.indexOf("for (const variant of variants)"));
  assert.ok(code.indexOf("cycles.sort(") < code.indexOf("for (const cycle of cycles)"));
  assert.ok(code.indexOf("meals.sort(") < code.indexOf("for (const meal of meals)"));
  assert.ok(code.indexOf("doseAllocations.sort(") < code.indexOf("for (const allocation of doseAllocations)"));
  assert.ok(code.indexOf("cycleSteps.sort(") < code.indexOf("for (const step of cycleSteps)"));
  assert.ok(code.includes("Date.parse(left.created_at)"));
});

test("historical snapshot hierarchy remains based on exact version, plan, variant and meal IDs", () => {
  const code = section("listAccessibleProtocolVersionMealPlans(", "listPublishedProtocolsForCurrentClient(");
  for (const expected of [
    "protocolVersionId: plan.protocol_version_id",
    "foodEquivalentCatalogVersionId: plan.food_equivalent_catalog_version_id",
    "variantsByPlanId.get(plan.id)",
    "mealsByVariantId.get(variant.id)",
    "dosesByMealId.get(meal.id)",
    "cyclesByPlanId.get(plan.id)",
    "stepsByCycleId.get(cycle.id)",
    "variantsById.get(step.variant_id)",
  ]) assert.ok(code.includes(expected), expected);
});

test("pagination reads every page and does not silently accept missing records", async () => {
  const calls: number[] = [];
  const result = await collectPublishedProtocolRows(["v1"], async (_ids, from, to) => {
    calls.push(from);
    assert.equal(to, from + PUBLISHED_PROTOCOL_PAGE_SIZE - 1);
    return { data: from === 0
      ? Array.from({ length: PUBLISHED_PROTOCOL_PAGE_SIZE }, (_, i) => i)
      : [PUBLISHED_PROTOCOL_PAGE_SIZE], error: null };
  });
  assert.equal(result.length, PUBLISHED_PROTOCOL_PAGE_SIZE + 1);
  assert.deepEqual(calls, [0, PUBLISHED_PROTOCOL_PAGE_SIZE]);
});

test("scoped lookup deduplicates IDs and batches them to avoid oversized PostgREST IN filters", async () => {
  const ids = Array.from({length: PUBLISHED_PROTOCOL_ID_BATCH_SIZE + 1}, (_, i) => String(i));
  const seen: number[] = [];
  await collectPublishedProtocolRows([...ids, ids[0]], async (batch, from) => {
    assert.equal(from, 0);
    seen.push(batch.length);
    return { data: [], error: null };
  });
  assert.deepEqual(seen, [PUBLISHED_PROTOCOL_ID_BATCH_SIZE, 1]);
});

test("a partial query failure cannot look like a complete historical protocol", async () => {
  await assert.rejects(
    collectPublishedProtocolRows(["version"], async () => ({data: null, error: new Error("RLS read denied")})),
    /RLS read denied/,
  );
  await assert.rejects(
    collectPublishedProtocolRows(["version"], async () => ({data: null, error: null})),
    /null rows without an error/,
  );
});

test("admin historical navigation reveals the selected exact native disclosure", () => {
  const disclosure=read("components/client/ClientHistoryDisclosure.tsx");
  assert.ok(admin.includes("<ClientHistoryDisclosure"));
  assert.ok(admin.includes('defaultOpen={isCurrentVersion || isRequestedVersion}'));
  assert.ok(admin.includes('id={`versao-${version.version_number}`}'));
  assert.ok(admin.includes("requestedProtocolVersion(requestedVersion, versions)"));
  assert.ok(disclosure.includes("window.addEventListener(\"hashchange\", revealTarget)"));
  assert.ok(disclosure.includes("details.open = true"));
  assert.ok(admin.includes('href: `/admin/protocolos/${protocol.id}?versao=${version.version_number}#versao-${version.version_number}`'));
  const styles=read("app/admin/protocolos/[protocoloId]/page.module.css");
  assert.ok(styles.includes(".versionDetails:target"));
  assert.ok(styles.includes(".versionDetails > summary:focus-visible"));
});

test("draft, review, approval, and publication controls remain professional and separate", () => {
  assert.ok(admin.includes("getProtocolLifecycleAction("));
  assert.ok(admin.includes("ProtocolLifecycleAction"));
  assert.ok(admin.includes("AdminProtocolDraftEditor"));
  assert.ok(admin.includes("getProtocolDraftReadiness(mealPlan)"));
  assert.ok(admin.includes("latestPublishedProtocolVersionId(versions, publications)"));
  assert.ok(!client.includes("AdminProtocolDraftEditor"));
  assert.ok(!client.includes("ProtocolLifecycleAction"));
  assert.ok(client.includes("listPublishedProtocolsForCurrentClient(client.id)"));
});

test("the professional list still validates ownership and explicit versionless recovery", () => {
  assert.ok(listing.includes('requireRole("admin")'));
  assert.ok(listing.includes("getAccessibleClient(clientId)"));
  assert.ok(listing.includes("listAccessibleProtocolVersionsForProtocols("));
  assert.ok(listing.includes("resumeVersionlessProtocolAction"));
  assert.ok(listing.includes("createAccessibleInitialProtocolVersion("));
  assert.ok(listing.includes("deleteAccessibleProtocolWithoutVersions("));
});

test("date fallback prevents legacy malformed protocol timestamps from crashing interfaces", () => {
  for (const source of [admin, listing, client]) {
    assert.ok(source.includes("Number.isFinite(Date.parse(value))"));
    assert.ok(source.includes("Intl.DateTimeFormat"));
    assert.ok(!source.includes("new Date(NaN)"));
  }
});
