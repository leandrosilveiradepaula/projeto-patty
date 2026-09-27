import assert from "node:assert/strict";
import test from "node:test";

import { buildProtocolCloneSnapshot } from "./clone-snapshot.ts";

test("protocol clone snapshot strips database identities and preserves factual content", () => {
  const snapshot = buildProtocolCloneSnapshot({
    id: "plan-id",
    protocolVersionId: "version-id",
    foodEquivalentCatalogVersionId: "catalog-id",
    variants: [
      {
        id: "variant-id",
        variantKey: "linear",
        label: "Linear",
        meals: [
          {
            id: "meal-id",
            position: 1,
            label: "Refeição 1",
            doseAllocations: [
              {
                id: "dose-id",
                doseType: "protein",
                doseQuantity: 2,
              },
            ],
          },
        ],
      },
    ],
    cycles: [
      {
        id: "cycle-id",
        steps: [
          {
            position: 1,
            variantId: "variant-id",
            variantKey: "linear",
            variantLabel: "Linear",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot, {
    foodEquivalentCatalogVersionId: "catalog-id",
    variants: [
      {
        variantKey: "linear",
        label: "Linear",
        meals: [
          {
            position: 1,
            label: "Refeição 1",
            doseAllocations: [
              {
                doseType: "protein",
                doseQuantity: 2,
              },
            ],
          },
        ],
      },
    ],
    cycles: [
      {
        steps: [
          {
            position: 1,
            variantKey: "linear",
          },
        ],
      },
    ],
  });

  const serialized = JSON.stringify(snapshot);
  for (const id of ["plan-id", "version-id", "variant-id", "meal-id", "dose-id", "cycle-id"]) {
    assert.equal(serialized.includes(id), false);
  }
});

test("protocol clone snapshot preserves absence of a meal plan", () => {
  assert.equal(buildProtocolCloneSnapshot(null), null);
});
