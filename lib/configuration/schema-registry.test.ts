import assert from "node:assert/strict";
import test from "node:test";

import {
  METHOD_CONFIGURATION_SCHEMA_KEYS,
  isMethodConfigurationSchemaKey,
  validateMethodConfigurationBySchema,
} from "./schema-registry.ts";

test("keeps the configuration schema registry closed", () => {
  assert.deepEqual(METHOD_CONFIGURATION_SCHEMA_KEYS, [
    "method_engine_v1",
    "scalar_parameter_v1",
    "carb_cycle_v1",
    "assessment_kind_catalog_v1",
    "assessment_definition_v1",
    "liquid_taxonomy_v1",
  ]);

  assert.equal(isMethodConfigurationSchemaKey("method_engine_v1"), true);
  assert.equal(isMethodConfigurationSchemaKey("javascript_v1"), false);
  assert.throws(
    () =>
      validateMethodConfigurationBySchema(
        "javascript_v1",
        { source: "return 1" },
      ),
    RangeError,
  );
});

test("delegates method_engine_v1 to the deterministic engine validator", () => {
  assert.deepEqual(
    validateMethodConfigurationBySchema("method_engine_v1", {
      inputs: {},
      parameters: {},
      outputs: {},
    }),
    {
      inputs: {},
      parameters: {},
      outputs: {},
    },
  );

  assert.throws(
    () =>
      validateMethodConfigurationBySchema("method_engine_v1", {
        inputs: {},
        parameters: {},
        outputs: {},
        eval: "forbidden",
      }),
    /unsupported field/i,
  );
});

test("validates scalar_parameter_v1 shape without guessing consumer units", () => {
  assert.deepEqual(
    validateMethodConfigurationBySchema("scalar_parameter_v1", {
      value: 24,
      unit: "hour",
    }),
    { value: 24, unit: "hour" },
  );

  assert.throws(
    () =>
      validateMethodConfigurationBySchema("scalar_parameter_v1", {
        value: 24,
        unit: "",
      }),
    TypeError,
  );
});

test("delegates carb_cycle_v1 to the closed carb-cycle parser", () => {
  const configuration = {
    phaseKey: "phase_1",
    steps: [
      {
        key: "low",
        label: "Low",
        carbohydratePerKg: { value: 1.5, unit: "g_per_kg" },
        proteinPerKg: { value: 2.3, unit: "g_per_kg" },
      },
    ],
    linearAverageStepKeys: ["low"],
  };

  assert.deepEqual(
    validateMethodConfigurationBySchema("carb_cycle_v1", configuration),
    configuration,
  );
});

test("delegates assessment catalog and definition schemas", () => {
  assert.deepEqual(
    validateMethodConfigurationBySchema("assessment_kind_catalog_v1", {
      entries: [
        {
          historicalCode: "legacy",
          semanticKey: "basic",
          label: "Básica",
        },
      ],
    }),
    {
      entries: [
        {
          historicalCode: "legacy",
          semanticKey: "basic",
          label: "Básica",
        },
      ],
    },
  );

  assert.deepEqual(
    validateMethodConfigurationBySchema("assessment_definition_v1", {
      kindKey: "basic",
      requiredMeasurements: [
        {
          key: "weight",
          label: "Peso",
          aliases: [],
        },
      ],
      photoRequirement: null,
    }),
    {
      kindKey: "basic",
      requiredMeasurements: [
        {
          key: "weight",
          label: "Peso",
          aliases: ["weight"],
        },
      ],
      photoRequirement: null,
    },
  );
});

test("delegates liquid_taxonomy_v1 without accepting ratio fields", () => {
  assert.deepEqual(
    validateMethodConfigurationBySchema("liquid_taxonomy_v1", {
      kinds: [
        {
          key: "water",
          label: "Água pura",
          hydrationClass: "pure_water",
        },
      ],
    }),
    {
      kinds: [
        {
          key: "water",
          label: "Água pura",
          hydrationClass: "pure_water",
        },
      ],
    },
  );

  assert.throws(
    () =>
      validateMethodConfigurationBySchema("liquid_taxonomy_v1", {
        kinds: [
          {
            key: "water",
            label: "Água pura",
            hydrationClass: "pure_water",
            minimumRatio: 0.6,
          },
        ],
      }),
    TypeError,
  );
});
