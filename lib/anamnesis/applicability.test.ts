import assert from "node:assert/strict";
import test from "node:test";

import { isAnamnesisQuestionApplicable } from "./applicability.ts";

test("question without applicability rule is applicable", () => {
  assert.equal(
    isAnamnesisQuestionApplicable(null, new Map()),
    true,
  );
});

test("conditional question is not applicable before source answer exists", () => {
  assert.equal(
    isAnamnesisQuestionApplicable(
      { sourceQuestionId: "q-source", expectedAnswer: "Sim" },
      new Map(),
    ),
    false,
  );
});

test("conditional question is applicable on exact scalar JSON match", () => {
  assert.equal(
    isAnamnesisQuestionApplicable(
      { sourceQuestionId: "q-source", expectedAnswer: "Sim" },
      new Map([["q-source", "Sim"]]),
    ),
    true,
  );

  assert.equal(
    isAnamnesisQuestionApplicable(
      { sourceQuestionId: "q-source", expectedAnswer: "Sim" },
      new Map([["q-source", "sim"]]),
    ),
    false,
  );
});

test("object answers compare structurally instead of by property insertion order", () => {
  assert.equal(
    isAnamnesisQuestionApplicable(
      {
        sourceQuestionId: "q-source",
        expectedAnswer: { selected: true, note: "x" },
      },
      new Map([
        ["q-source", { note: "x", selected: true }],
      ]),
    ),
    true,
  );
});

test("array order remains significant", () => {
  assert.equal(
    isAnamnesisQuestionApplicable(
      {
        sourceQuestionId: "q-source",
        expectedAnswer: ["A", "B"],
      },
      new Map([["q-source", ["B", "A"]]]),
    ),
    false,
  );
});
