import assert from "node:assert/strict";
import test from "node:test";
import {
  compareAnamnesisReviewChronology,
  summarizeAnamnesisReviewHistory,
} from "./review-summary.ts";

type Review = { id: string; submission_id: string; created_at: string };
const review = (id: string, submission_id: string, created_at: string): Review =>
  ({ id, submission_id, created_at });

test("no professional notes means no false review state", () => {
  assert.equal(summarizeAnamnesisReviewHistory([]).size, 0);
});

test("a single professional note retains its original ID and timestamp", () => {
  const row = review("r-1", "s-1", "2026-10-09T12:00:00Z");
  const summary = summarizeAnamnesisReviewHistory([row]).get("s-1");
  assert.equal(summary?.count, 1);
  assert.equal(summary?.latest, row);
});

test("each Anamnesis submission has an independent factual note count", () => {
  const rows = [
    review("r1", "a", "2026-10-08T10:00:00Z"),
    review("r2", "b", "2026-10-09T10:00:00Z"),
    review("r3", "a", "2026-10-10T10:00:00Z"),
  ];
  const summaries = summarizeAnamnesisReviewHistory(rows);
  assert.equal(summaries.size, 2);
  assert.equal(summaries.get("a")?.count, 2);
  assert.equal(summaries.get("b")?.count, 1);
  assert.equal(summaries.get("a")?.latest.id, "r3");
  assert.equal(summaries.get("b")?.latest.id, "r2");
});

test("actual review instant wins over lexical date order across offsets", () => {
  const earlier = review("earlier", "s", "2026-10-10T14:00:00+02:00");
  const later = review("later", "s", "2026-10-10T10:00:00-03:00");
  assert.ok(compareAnamnesisReviewChronology(earlier, later) < 0);
  for (const order of [[earlier, later], [later, earlier]]) {
    assert.equal(summarizeAnamnesisReviewHistory(order).get("s")?.latest.id, "later");
  }
});

test("same-instant notes use stable IDs, independent of query batch order", () => {
  const rows = [
    review("z", "s", "2026-10-10T09:00:00-03:00"),
    review("a", "s", "2026-10-10T12:00:00Z"),
  ];
  assert.equal(compareAnamnesisReviewChronology(rows[0], rows[1]) > 0, true);
  assert.equal(summarizeAnamnesisReviewHistory(rows).get("s")?.latest.id, "z");
  assert.equal(summarizeAnamnesisReviewHistory(rows.slice().reverse()).get("s")?.latest.id, "z");
});

test("legacy invalid dates do not supersede a valid professional note", () => {
  const rows = [
    review("bad", "s", "not-a-date"),
    review("valid", "s", "2026-10-09T12:00:00Z"),
  ];
  assert.equal(summarizeAnamnesisReviewHistory(rows).get("s")?.latest.id, "valid");
  assert.equal(summarizeAnamnesisReviewHistory(rows.slice().reverse()).get("s")?.latest.id, "valid");
});

test("the summaries do not mutate, merge, delete or rewrite original review records", () => {
  const rows = Object.freeze([
    Object.freeze(review("a", "one", "2026-10-08T10:00:00Z")),
    Object.freeze(review("b", "one", "2026-10-09T10:00:00Z")),
  ]);
  assert.equal(summarizeAnamnesisReviewHistory(rows).get("one")?.latest, rows[1]);
  assert.equal(rows.length, 2);
});
