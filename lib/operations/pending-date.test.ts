import assert from "node:assert/strict";
import test from "node:test";
import { formatPendingQueueDateTime } from "./pending-date.ts";

test("the admin pending queue shows actual Sao Paulo instants", () => {
  assert.equal(formatPendingQueueDateTime("2026-10-12T11:00:00Z"), "12/10/2026, 08:00");
});

test("invalid legacy operational timestamps never throw", () => {
  for (const value of ["", "invalid-date", "broken", "2026-13-45T00:00:00Z"]) {
    assert.equal(formatPendingQueueDateTime(value), "Data indisponível");
  }
});
