import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentKindLabelFromCatalog,
  parseAssessmentKindCatalogConfiguration,
  resolveAssessmentKindByHistoricalCode,
} from "./assessment-kind-catalog.ts";

const currentBaseline = {
  entries: [
    {
      historicalCode: "fortnightly",
      semanticKey: "basic",
      label: "Básica",
    },
    {
      historicalCode: "monthly",
      semanticKey: "complete",
      label: "Completa",
    },
  ],
};

test("reproduces the current historical assessment mapping", () => {
  assert.deepEqual(
    resolveAssessmentKindByHistoricalCode(
      currentBaseline,
      "fortnightly",
    ),
    {
      historicalCode: "fortnightly",
      semanticKey: "basic",
      label: "Básica",
    },
  );

  assert.equal(
    assessmentKindLabelFromCatalog(currentBaseline, "monthly"),
    "Completa",
  );
  assert.equal(
    assessmentKindLabelFromCatalog(currentBaseline, null),
    "Legada / não classificada",
  );
});

test("supports changed labels and semantic mappings without runtime changes", () => {
  const changed = structuredClone(currentBaseline);
  changed.entries[0].label = "Avaliação inicial";
  changed.entries[0].semanticKey = "initial";

  assert.equal(
    resolveAssessmentKindByHistoricalCode(
      changed,
      "fortnightly",
    ).semanticKey,
    "initial",
  );
  assert.equal(
    assessmentKindLabelFromCatalog(changed, "fortnightly"),
    "Avaliação inicial",
  );
});

test("fails closed for an unknown historical code", () => {
  assert.throws(
    () =>
      resolveAssessmentKindByHistoricalCode(
        currentBaseline,
        "weekly",
      ),
    RangeError,
  );
});

test("rejects duplicate historical codes, duplicate semantic keys, and unknown fields", () => {
  assert.throws(
    () =>
      parseAssessmentKindCatalogConfiguration({
        entries: [
          currentBaseline.entries[0],
          {
            historicalCode: "fortnightly",
            semanticKey: "other",
            label: "Outra",
          },
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseAssessmentKindCatalogConfiguration({
        entries: [
          currentBaseline.entries[0],
          {
            historicalCode: "other",
            semanticKey: "basic",
            label: "Outra",
          },
        ],
      }),
    TypeError,
  );

  assert.throws(
    () =>
      parseAssessmentKindCatalogConfiguration({
        entries: [
          {
            ...currentBaseline.entries[0],
            cadenceDays: 15,
          },
        ],
      }),
    TypeError,
  );
});
