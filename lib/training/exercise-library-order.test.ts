import assert from "node:assert/strict";
import test from "node:test";
import { newestExerciseLibrarySummaries } from "./exercise-library-order.ts";

const item = (id: string, date: string, version_number = 1) => ({
  latestVersion: {exercise_id:id,id:id+"-v"+version_number,created_at:date,version_number},
});

test("catalogue ordering uses actual instants, including timezone offsets", () => {
  const entries=[item("earlier","2026-10-09T12:00:00Z"),item("later","2026-10-09T10:00:00-03:00")];
  assert.deepEqual(newestExerciseLibrarySummaries(entries).map(x=>x.latestVersion.exercise_id),["later","earlier"]);
  assert.equal(entries[0].latestVersion.exercise_id,"earlier");
});

test("malformed legacy timestamps fall behind valid ones and cannot hide exercises",()=>{
  const entries=[item("invalid","not-a-date"),item("valid","2026-10-09T12:00:00Z")];
  assert.deepEqual(newestExerciseLibrarySummaries(entries).map(x=>x.latestVersion.exercise_id),["valid","invalid"]);
});

test("same-instant exercise summaries sort by version then ID, without mutating",()=>{
  const entries=[item("b","2026-10-09T09:00:00-03:00"),item("a","2026-10-09T12:00:00Z",2),item("c","2026-10-09T12:00:00Z")];
  assert.deepEqual(newestExerciseLibrarySummaries(entries).map(x=>x.latestVersion.exercise_id),["a","b","c"]);
  assert.equal(entries[0].latestVersion.exercise_id,"b");
});
