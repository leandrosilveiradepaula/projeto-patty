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

test("catalog rejects oversized historical codes, semantic keys and labels", () => {
  for (const entry of [
    { historicalCode: "a".repeat(121), semanticKey: "basic", label: "Basic" },
    { historicalCode: "weekly", semanticKey: "a".repeat(121), label: "Basic" },
    { historicalCode: "weekly", semanticKey: "basic", label: "x".repeat(201) },
  ]) {
    assert.throws(() => parseAssessmentKindCatalogConfiguration({ entries: [entry] }), /maximum field length/);
  }
});

test("catalog rejects malformed historical identifiers", () => {
  for (const historicalCode of ["UPPER", "white space", "1start", "é", "a/b"]) {
    assert.throws(() => parseAssessmentKindCatalogConfiguration({ entries: [{ historicalCode, semanticKey: "basic", label: "Basic" }] }), /invalid identifier/);
  }
});

test("catalog rejects malformed semantic identifiers", () => {
  for (const semanticKey of ["UPPER", "two words", "1start", "é", "a/b"]) {
    assert.throws(() => parseAssessmentKindCatalogConfiguration({ entries: [{ historicalCode: "weekly", semanticKey, label: "Basic" }] }), /invalid identifier/);
  }
});

test("catalog rejects malformed lookup inputs", () => {
  assert.throws(() => resolveAssessmentKindByHistoricalCode(currentBaseline, " monthly "), /valid string/);
  assert.throws(() => resolveAssessmentKindByHistoricalCode(currentBaseline, null as never), /valid string/);
});

test("catalog preserves configurable historical and semantic identifiers", () => {
  const custom = { entries: [{ historicalCode: "weekly_v2", semanticKey: "initial-phase", label: "Inicial" }] };
  assert.equal(resolveAssessmentKindByHistoricalCode(custom, "weekly_v2").semanticKey, "initial-phase");
});
