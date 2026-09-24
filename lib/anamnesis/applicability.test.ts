import assert from "node:assert/strict";
import test from "node:test";

import {
  areJsonValuesEqual,
  getApplicableAnamnesisQuestionIds,
} from "./applicability.ts";

test("compares JSON values with jsonb-style object key order independence", () => {
  assert.equal(areJsonValuesEqual("Sim", "Sim"), true);
  assert.equal(areJsonValuesEqual("Sim", "Nao"), false);
  assert.equal(areJsonValuesEqual([1, "a"], [1, "a"]), true);
  assert.equal(areJsonValuesEqual([1, "a"], ["a", 1]), false);
  assert.equal(
    areJsonValuesEqual({ b: 2, a: { x: true } }, { a: { x: true }, b: 2 }),
    true,
  );
});

test("keeps unconditional questions applicable", () => {
  const applicable = getApplicableAnamnesisQuestionIds(
    [
      {
        id: "base",
        applicability_source_question_id: null,
        applicability_expected_answer: null,
      },
    ],
    [],
  );

  assert.deepEqual([...applicable], ["base"]);
});

test("shows a dependent question only when its applicable source answer matches", () => {
  const questions = [
    {
      id: "base",
      applicability_source_question_id: null,
      applicability_expected_answer: null,
    },
    {
      id: "detail",
      applicability_source_question_id: "base",
      applicability_expected_answer: "Sim",
    },
  ];

  assert.deepEqual(
    [...getApplicableAnamnesisQuestionIds(questions, [])],
    ["base"],
  );
  assert.deepEqual(
    [
      ...getApplicableAnamnesisQuestionIds(questions, [
        { question_id: "base", answer_value: "Nao" },
      ]),
    ],
    ["base"],
  );
  assert.deepEqual(
    [
      ...getApplicableAnamnesisQuestionIds(questions, [
        { question_id: "base", answer_value: "Sim" },
      ]),
    ],
    ["base", "detail"],
  );
});

test("requires the source question itself to remain applicable", () => {
  const questions = [
    {
      id: "root",
      applicability_source_question_id: null,
      applicability_expected_answer: null,
    },
    {
      id: "middle",
      applicability_source_question_id: "root",
      applicability_expected_answer: "Sim",
    },
    {
      id: "detail",
      applicability_source_question_id: "middle",
      applicability_expected_answer: "Sim",
    },
  ];

  const applicable = getApplicableAnamnesisQuestionIds(questions, [
    { question_id: "root", answer_value: "Nao" },
    { question_id: "middle", answer_value: "Sim" },
  ]);

  assert.deepEqual([...applicable], ["root"]);
});

test("fails closed for malformed pairs, missing sources and cycles", () => {
  const applicable = getApplicableAnamnesisQuestionIds(
    [
      {
        id: "malformed",
        applicability_source_question_id: "source",
        applicability_expected_answer: null,
      },
      {
        id: "missing-source",
        applicability_source_question_id: "absent",
        applicability_expected_answer: "Sim",
      },
      {
        id: "cycle-a",
        applicability_source_question_id: "cycle-b",
        applicability_expected_answer: "Sim",
      },
      {
        id: "cycle-b",
        applicability_source_question_id: "cycle-a",
        applicability_expected_answer: "Sim",
      },
    ],
    [
      { question_id: "cycle-a", answer_value: "Sim" },
      { question_id: "cycle-b", answer_value: "Sim" },
    ],
  );

  assert.equal(applicable.size, 0);
});
