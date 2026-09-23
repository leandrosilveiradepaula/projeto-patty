import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_ANAMNESIS_FORM_KEY,
  selectCurrentPublishedAnamnesisVersion,
} from "./start-policy.ts";

test("uses a stable client-facing Anamnese form key", () => {
  assert.equal(CLIENT_ANAMNESIS_FORM_KEY, "client-anamnesis");
});

test("selects the highest published version number", () => {
  assert.deepEqual(
    selectCurrentPublishedAnamnesisVersion([
      {
        id: "v1",
        published_at: "2026-09-20T10:00:00.000Z",
        version_number: 1,
      },
      {
        id: "v3",
        published_at: "2026-09-22T10:00:00.000Z",
        version_number: 3,
      },
      {
        id: "v2",
        published_at: "2026-09-23T10:00:00.000Z",
        version_number: 2,
      },
    ]),
    {
      id: "v3",
      published_at: "2026-09-22T10:00:00.000Z",
      version_number: 3,
    },
  );
});

test("ignores unpublished versions", () => {
  assert.deepEqual(
    selectCurrentPublishedAnamnesisVersion([
      {
        id: "draft-v2",
        published_at: null,
        version_number: 2,
      },
      {
        id: "published-v1",
        published_at: "2026-09-20T10:00:00.000Z",
        version_number: 1,
      },
    ]),
    {
      id: "published-v1",
      published_at: "2026-09-20T10:00:00.000Z",
      version_number: 1,
    },
  );
});

test("returns null when no published version exists", () => {
  assert.equal(
    selectCurrentPublishedAnamnesisVersion([
      {
        id: "draft-v1",
        published_at: null,
        version_number: 1,
      },
    ]),
    null,
  );
});
