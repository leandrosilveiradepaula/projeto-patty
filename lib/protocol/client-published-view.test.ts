import assert from "node:assert/strict";
import test from "node:test";

import { comparePlanVariantRegistration } from "./variant-registration-order.ts";
import {
  buildClientPublishedNutritionView,
  publishedMealLabel,
  publishedVariationAnchor,
  publishedMealAnchor,
  publishedCycleAnchor,
  publishedVariationLabel,
  publishedVersionHref,
  selectClientPublishedVersion,
} from "./client-published-view.ts";

const ids = {
  publication: "11111111-1111-4111-8111-111111111111",
  current: "22222222-2222-4222-8222-222222222222",
  variantA: "33333333-3333-4333-8333-333333333333",
  variantB: "44444444-4444-4444-8444-444444444444",
  missing: "55555555-5555-4555-8555-555555555555",
};

test("variant registration order ignores randomized draft keys and uses a deterministic tie break", () => {
  const rows = [
    { id: "b", meal_plan_version_id: "p", created_at: "2026-10-11T12:00:00Z" },
    { id: "a", meal_plan_version_id: "p", created_at: "2026-10-11T12:00:00Z" },
    { id: "z", meal_plan_version_id: "p", created_at: "2026-10-11T09:00:00Z" },
    { id: "w", meal_plan_version_id: "a", created_at: "2026-10-12T00:00:00Z" },
  ];
  assert.deepEqual(rows.sort(comparePlanVariantRegistration).map((row) => row.id), ["w", "z", "a", "b"]);
  assert.ok(comparePlanVariantRegistration(
    { id: "a", meal_plan_version_id: "p", created_at: "bad" },
    { id: "b", meal_plan_version_id: "p", created_at: "2026-10-11T12:00:00Z" },
  ) > 0);
});

test("labels never expose opaque draft keys and preserve a genuine professional label", () => {
  assert.equal(publishedVariationLabel(null, 1), "Variação 1");
  assert.equal(publishedVariationLabel("   ", 3), "Variação 3");
  assert.equal(publishedVariationLabel("  Dia B  ", 2), "Dia B");
  assert.equal(publishedMealLabel(null, 4), "Refeição 4");
  assert.equal(publishedMealLabel("  Almoço  ", 4), "Almoço");
});

test("cycles resolve labels only against variants in the same published plan", () => {
  const view = buildClientPublishedNutritionView({
    variants: [
      { id: ids.variantA, variantKey: "draft-secret-key", label: null, meals: [
        { id: "m2", position: 2, label: null, doseAllocations: [{ id: "d2", doseType: "protein", doseQuantity: 1.5 }] },
        { id: "m1", position: 1, label: "Café", doseAllocations: [] },
      ] },
      { id: ids.variantB, variantKey: "draft-second-key", label: "Dia B", meals: [] },
    ],
    cycles: [
      { id: "cycle-a", steps: [
        { position: 3, variantId: ids.variantB, variantKey: "draft-second-key", variantLabel: "OUTDATED" },
        { position: 1, variantId: ids.variantA, variantKey: "draft-secret-key", variantLabel: null },
        { position: 2, variantId: ids.variantA, variantKey: "draft-secret-key", variantLabel: null },
      ] },
      { id: "cycle-b", steps: [
        { position: 1, variantId: ids.missing, variantKey: "missing", variantLabel: "Other client" },
      ] },
    ],
  });
  assert.deepEqual(view.variants.map((v) => v.label), ["Variação 1", "Dia B"]);
  assert.deepEqual(view.variants[0].meals.map((m) => [m.order, m.label]), [[1, "Café"], [2, "Refeição 2"]]);
  assert.deepEqual(view.cycles[0].steps.map((s) => [s.position, s.label]), [
    [1, "Variação 1"], [2, "Variação 1"], [3, "Dia B"],
  ]);
  assert.deepEqual(view.cycles[1].steps.map((s) => [s.targetExists, s.label]), [
    [false, "Variação indisponível nesta versão"],
  ]);
  assert.deepEqual([view.variantCount, view.mealCount, view.cycleCount, view.stepCount], [2, 2, 2, 4]);
  assert.equal(JSON.stringify(view).includes("draft-secret-key"), false);
  assert.equal(JSON.stringify(view).includes("Other client"), false);
});

test("empty published plan remains factual and has no inferred daily step", () => {
  const view = buildClientPublishedNutritionView({ variants: [], cycles: [] });
  assert.deepEqual(view.variants, []);
  assert.deepEqual(view.cycles, []);
  assert.deepEqual([view.variantCount, view.mealCount, view.cycleCount, view.stepCount], [0, 0, 0, 0]);
});

test("history selector only admits already visible publication IDs", () => {
  const pubs = [{ id: ids.current }, { id: ids.publication }];
  assert.deepEqual(selectClientPublishedVersion(pubs, undefined), {
    selectedId: ids.current, invalidRequest: false, isHistorical: false,
  });
  assert.deepEqual(selectClientPublishedVersion(pubs, ids.publication), {
    selectedId: ids.publication, invalidRequest: false, isHistorical: true,
  });
  for (const invalid of [null, "", "non-existent", ids.missing, [ids.publication, ids.current], 3]) {
    assert.deepEqual(selectClientPublishedVersion(pubs, invalid), {
      selectedId: ids.current, invalidRequest: true, isHistorical: false,
    });
  }
  assert.deepEqual(selectClientPublishedVersion([], ids.publication), {
    selectedId: null, invalidRequest: true, isHistorical: false,
  });
});

test("publication and variant anchors use stable, version-scoped destinations", () => {
  assert.equal(publishedVariationAnchor(ids.publication, ids.variantA),
    "variacao-" + ids.publication + "-" + ids.variantA);
  assert.equal(publishedVersionHref(ids.publication),
    "/cliente/protocolo?publicacao=" + ids.publication + "#publicacao-" + ids.publication);
});

test("meal and cycle anchors are isolated by the exact publication and row", () => {
  assert.equal(publishedMealAnchor(ids.publication,"meal-a"),"refeicao-"+ids.publication+"-meal-a");
  assert.equal(publishedCycleAnchor(ids.publication,"cycle-a"),"ciclo-"+ids.publication+"-cycle-a");
  assert.notEqual(publishedMealAnchor(ids.current,"meal-a"),publishedMealAnchor(ids.publication,"meal-a"));
});
