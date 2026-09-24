import assert from "node:assert/strict";
import test from "node:test";

import {
  getApplicableAnamnesisQuestionIds,
  isAnamnesisQuestionApplicable,
} from "./applicability.ts";

test("question without applicability rule is applicable", () => {
  assert.equal(isAnamnesisQuestionApplicable(null, new Map()), true);
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
      new Map([["q-source", { note: "x", selected: true }]]),
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

test("unconditional questions remain visible in the version-level evaluator", () => {
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

test("dependent visibility follows the persisted source answer", () => {
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

  assert.deepEqual([...getApplicableAnamnesisQuestionIds(questions, [])], ["base"]);
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

test("a dependent requires its source question to remain applicable", () => {
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

test("malformed pairs, missing sources and cycles fail closed", () => {
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
