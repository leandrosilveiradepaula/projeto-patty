import assert from "node:assert/strict";
import test from "node:test";

import {
  isPureWaterLiquidKind,
  parseLiquidTaxonomyConfiguration,
  resolveLiquidKind,
} from "./liquid-taxonomy.ts";

const currentBaseline = {
  kinds: [
    {
      key: "water",
      label: "Água pura",
      hydrationClass: "pure_water",
    },
    {
      key: "zero_calorie_other",
      label: "Outro líquido zero calorias",
      hydrationClass: "zero_calorie_other",
    },
  ],
};

test("reproduces the current liquid-kind taxonomy from configuration", () => {
  assert.deepEqual(resolveLiquidKind(currentBaseline, "water"), {
    key: "water",
    label: "Água pura",
    hydrationClass: "pure_water",
  });
  assert.equal(
    isPureWaterLiquidKind(currentBaseline, "water"),
    true,
  );
  assert.equal(
    isPureWaterLiquidKind(currentBaseline, "zero_calorie_other"),
    false,
  );
});

test("supports a changed eligible-kind catalog without runtime changes", () => {
  const changed = {
    kinds: [
      ...currentBaseline.kinds,
      {
        key: "unsweetened_tea",
        label: "Chá sem calorias",
        hydrationClass: "zero_calorie_other",
      },
    ],
  };

  assert.equal(
    resolveLiquidKind(changed, "unsweetened_tea").hydrationClass,
    "zero_calorie_other",
  );
});

test("fails closed for kinds absent from the active taxonomy", () => {
  assert.throws(
    () => resolveLiquidKind(currentBaseline, "juice"),
    RangeError,
  );
});

test("rejects duplicate keys, unknown classes, and unknown fields", () => {
  assert.throws(
    () =>
      parseLiquidTaxonomyConfiguration({
        kinds: [
          currentBaseline.kinds[0],
          currentBaseline.kinds[0],
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseLiquidTaxonomyConfiguration({
        kinds: [
          {
            key: "water",
            label: "Água",
            hydrationClass: "caloric",
          },
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseLiquidTaxonomyConfiguration({
        kinds: [
          {
            ...currentBaseline.kinds[0],
            minimumRatio: 0.6,
          },
        ],
      }),
    TypeError,
  );
});

test("requires at least one pure-water category but does not infer a ratio", () => {
  assert.throws(
    () =>
      parseLiquidTaxonomyConfiguration({
        kinds: [
          {
            key: "tea",
            label: "Chá sem calorias",
            hydrationClass: "zero_calorie_other",
          },
        ],
      }),
    TypeError,
  );
});

test("liquid taxonomy rejects unsafe identifiers and oversized labels", () => {
  for (const key of ["Unsafe", "with space", "a/b", "1start", "a".repeat(121)]) {
    assert.throws(() => parseLiquidTaxonomyConfiguration({ kinds: [
      { key, label: "Água", hydrationClass: "pure_water" },
    ] }), /invalid key/);
  }
  assert.throws(() => parseLiquidTaxonomyConfiguration({ kinds: [
    { key: "water", label: "x".repeat(201), hydrationClass: "pure_water" },
  ] }), /invalid key/);
});
