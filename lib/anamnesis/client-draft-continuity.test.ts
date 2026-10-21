import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  currentClientAnamnesisDraft,
  orderClientAnamnesisDrafts,
} from "./client-draft-continuity.ts";

test("orders only active drafts by their factual creation instant", () => {
  const submissions = [
    { id: "legacy", created_at: "invalid-date", submitted_at: null },
    { id: "old", created_at: "2026-10-01T10:00:00Z", submitted_at: null },
    { id: "new", created_at: "2026-10-02T07:00:00-03:00", submitted_at: null },
    { id: "sent", created_at: "2026-10-03T10:00:00Z", submitted_at: "2026-10-03T12:00:00Z" },
  ];

  assert.deepEqual(
    orderClientAnamnesisDrafts(submissions).map((submission) => submission.id),
    ["new", "old", "legacy"],
  );
  assert.equal(currentClientAnamnesisDraft(submissions)?.id, "new");
});

test("uses a stable id fallback when creation instants tie or are unavailable", () => {
  assert.deepEqual(
    orderClientAnamnesisDrafts([
      { id: "a", created_at: "invalid", submitted_at: null },
      { id: "b", created_at: "invalid", submitted_at: null },
      { id: "c", created_at: "2026-10-01T00:00:00Z", submitted_at: null },
      { id: "d", created_at: "2026-10-01T00:00:00Z", submitted_at: null },
    ]).map((submission) => submission.id),
    ["d", "c", "b", "a"],
  );
  assert.equal(currentClientAnamnesisDraft([]), null);
});

test("client entry points resume existing drafts before offering another one", () => {
  const home = readFileSync(new URL("../../app/cliente/page.tsx", import.meta.url), "utf8");
  const history = readFileSync(new URL("../../app/cliente/anamnese/page.tsx", import.meta.url), "utf8");

  assert.match(home, /currentClientAnamnesisDraft\(anamneses\)/);
  assert.match(history, /orderClientAnamnesisDrafts\(submissions \?\? \[\]\)/);
  assert.match(history, /startAvailability\.available && !currentDraft/);
  assert.match(history, /activeDrafts\.map/);
  assert.match(history, /Retomar rascunho/);
});
