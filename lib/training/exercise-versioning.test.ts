import assert from "node:assert/strict";
import test from "node:test";

import {
  findSingleDraftExerciseVersion,
  nextExerciseVersionNumber,
  selectLatestPublishedExerciseVersions,
} from "./exercise-versioning.ts";

const version = (
  input: Partial<{
    created_at: string;
    exercise_id: string;
    id: string;
    name: string;
    published_at: string | null;
    version_number: number;
  }> = {},
) => ({
  created_at: "2026-10-05T10:00:00Z",
  exercise_id: "exercise-1",
  id: "version-1",
  name: "Agachamento",
  published_at: "2026-10-05T10:00:00Z",
  version_number: 1,
  ...input,
});

test("next exercise version number follows the highest persisted version", () => {
  assert.equal(nextExerciseVersionNumber([]), 1);
  assert.equal(
    nextExerciseVersionNumber([
      version({ version_number: 1 }),
      version({ version_number: 3 }),
      version({ version_number: 2 }),
    ]),
    4,
  );
});

test("exercise versioning allows at most one operational draft", () => {
  assert.equal(
    findSingleDraftExerciseVersion([
      version({ published_at: "2026-10-05T10:00:00Z" }),
      version({ id: "draft", published_at: null, version_number: 2 }),
    ])?.id,
    "draft",
  );

  assert.throws(
    () =>
      findSingleDraftExerciseVersion([
        version({ id: "draft-1", published_at: null }),
        version({ id: "draft-2", published_at: null, version_number: 2 }),
      ]),
    /more than one draft/i,
  );
});

test("client exercise library exposes only the latest published version per exercise", () => {
  const selected = selectLatestPublishedExerciseVersions([
    version({
      exercise_id: "exercise-1",
      id: "exercise-1-v1",
      name: "Agachamento v1",
      published_at: "2026-10-01T10:00:00Z",
      version_number: 1,
    }),
    version({
      exercise_id: "exercise-1",
      id: "exercise-1-v2",
      name: "Agachamento v2",
      published_at: "2026-10-03T10:00:00Z",
      version_number: 2,
    }),
    version({
      exercise_id: "exercise-1",
      id: "exercise-1-draft",
      name: "Agachamento futuro",
      published_at: null,
      version_number: 3,
    }),
    version({
      exercise_id: "exercise-2",
      id: "exercise-2-v1",
      name: "Remada",
      published_at: "2026-10-04T10:00:00Z",
      version_number: 1,
    }),
  ]);

  assert.deepEqual(
    selected.map((item) => item.id),
    ["exercise-2-v1", "exercise-1-v2"],
  );
});
