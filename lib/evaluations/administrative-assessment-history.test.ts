import assert from "node:assert/strict";
import test from "node:test";

import {
  findPreviousFinalizedAssessment,
  formatAdministrativeAssessmentDate,
  orderAdministrativeAssessments,
} from "./administrative-assessment-history.ts";

type Assessment = {
  id: string;
  assessed_at: string;
  finalized_at: string | null;
  label?: string;
};

const rows: Assessment[] = [
  { id: "a-old", assessed_at: "2026-10-08T09:00:00-03:00", finalized_at: "2026-10-08T17:00:00Z" },
  { id: "b-tie", assessed_at: "2026-10-09T13:00:00Z", finalized_at: "2026-10-09T18:00:00Z" },
  { id: "c-tie", assessed_at: "2026-10-09T10:00:00-03:00", finalized_at: "2026-10-09T18:00:00Z" },
  { id: "d-new", assessed_at: "2026-10-10T16:00:00+01:00", finalized_at: null },
  { id: "invalid", assessed_at: "legacy-invalid", finalized_at: "2026-10-09T18:00:00Z" },
];

test("administrative assessment order uses actual instants across differing timezone offsets", () => {
  const sorted = orderAdministrativeAssessments(rows);
  assert.deepEqual(sorted.map((x) => x.id), [
    "d-new", "b-tie", "c-tie", "a-old", "invalid",
  ]);
});

test("stable order preserves source records, metadata and input array", () => {
  const source = [
    { id: "z", assessed_at: "2026-10-10T12:00:00Z", finalized_at: null, label: "original" },
    { id: "a", assessed_at: "2026-10-10T12:00:00Z", finalized_at: null, label: "final" },
  ];
  const result = orderAdministrativeAssessments(source);
  assert.deepEqual(result.map((x) => x.id), ["a", "z"]);
  assert.equal(result[0], source[1]);
  assert.deepEqual(source.map((x) => x.id), ["z", "a"]);
  assert.equal(result[1].label, "original");
});

test("previous assessment is the closest older finalized one, regardless of input order", () => {
  const current = { id: "current", assessed_at: "2026-10-10T14:00:00Z" };
  const previous = findPreviousFinalizedAssessment(current, [
    { id: "older", assessed_at: "2026-10-01T09:00:00Z", finalized_at: "2026-10-02T09:00:00Z" },
    { id: "same-id", assessed_at: "2026-10-10T14:00:00Z", finalized_at: "2026-10-10T16:00:00Z" },
    { id: "near", assessed_at: "2026-10-10T13:59:00Z", finalized_at: "2026-10-10T16:00:00Z" },
    { id: "draft", assessed_at: "2026-10-10T13:59:45Z", finalized_at: null },
  ]);
  assert.equal(previous?.id, "near");
});

test("same instant does not falsely claim chronological precedence", () => {
  const current = { id: "current", assessed_at: "2026-10-10T13:00:00Z" };
  const previous = findPreviousFinalizedAssessment(current, [
    { id: "same-local-time", assessed_at: "2026-10-10T10:00:00-03:00", finalized_at: "2026-10-11T12:00:00Z" },
    { id: "future", assessed_at: "2026-10-10T13:01:00Z", finalized_at: "2026-10-11T12:00:00Z" },
  ]);
  assert.equal(previous, null);
});

test("finalization status is required for an assessment to become the previous comparison", () => {
  const current = { id: "selected", assessed_at: "2026-10-10T14:00:00Z" };
  const previous = findPreviousFinalizedAssessment(current, [
    { id: "draft", assessed_at: "2026-10-10T13:00:00Z", finalized_at: null },
    { id: "finalized", assessed_at: "2026-10-09T13:00:00Z", finalized_at: "2026-10-09T14:00:00Z" },
  ]);
  assert.equal(previous?.id, "finalized");
});

test("invalid legacy dates are never compared as earlier records", () => {
  const current = { id: "current", assessed_at: "2026-10-11" };
  const previous = findPreviousFinalizedAssessment(current, [
    { id: "invalid", assessed_at: "not-a-date", finalized_at: "2026-10-09T14:00:00Z" },
    { id: "valid", assessed_at: "2026-10-09T14:00:00Z", finalized_at: "2026-10-09T15:00:00Z" },
  ]);
  assert.equal(previous?.id, "valid");
  assert.equal(findPreviousFinalizedAssessment({ id: "bad", assessed_at: "invalid" }, rows), null);
});

test("equal older instants get a stable ID tie-break without implying order within that instant", () => {
  const current = { id: "current", assessed_at: "2026-10-11T14:00:00Z" };
  const previous = findPreviousFinalizedAssessment(current, rows);
  assert.equal(previous?.id, "b-tie");
});

test("date labels are in Sao Paulo timezone and invalid legacy data gets a factual fallback", () => {
  assert.equal(formatAdministrativeAssessmentDate("not a date"), "Data indisponível");
  assert.equal(formatAdministrativeAssessmentDate(""), "Data indisponível");
  assert.equal(formatAdministrativeAssessmentDate("2026-10-10T02:00:00Z"), "09/10/2026");
});
