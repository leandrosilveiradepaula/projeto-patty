import assert from "node:assert/strict";
import test from "node:test";
import {
  exerciseCatalogBackHref,
  exerciseDirectoryPageHref,
  readExerciseCatalogSort,
  sortExerciseCatalog,
} from "./exercise-admin-directory.ts";

const make = (
  id: string, name: string, created: string,
  published: string | null, versions: number,
) => ({
  latestVersion: {
    id: id + "-v", exercise_id: id, name, created_at: created,
    published_at: published, version_number: versions,
  },
  latestPublishedVersion: published ? {
    id: id + "-v", exercise_id: id, name, created_at: created,
    published_at: published, version_number: versions,
  } : null,
  versionCount: versions,
});
const a = make("a", "Árvore", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", 2);
const b = make("b", "Bola", "2026-03-01T00:00:00Z", null, 5);
const c = make("c", "Alcance", "bad-legacy-date", "2026-04-01T00:00:00Z", 1);
const source = [a, b, c];

test("untrusted and repeated order parameters do not alter the catalog", () => {
  assert.equal(readExerciseCatalogSort(undefined), "recent");
  assert.equal(readExerciseCatalogSort(["name-asc"]), "recent");
  assert.equal(readExerciseCatalogSort("INCOMPLETE"), "recent");
  assert.equal(readExerciseCatalogSort("__proto__"), "recent");
  for (const sort of ["oldest", "name-asc", "name-desc", "published", "versions"]) {
    assert.equal(readExerciseCatalogSort(sort), sort);
  }
});

test("all alternative sorting is factual, stable, non-destructive", () => {
  const ids = (sort: Parameters<typeof sortExerciseCatalog>[1]) =>
    sortExerciseCatalog(source, sort).map(item => item.latestVersion.exercise_id);
  assert.deepEqual(ids("recent"), ["b", "a", "c"]);
  assert.deepEqual(ids("oldest"), ["a", "b", "c"]);
  assert.deepEqual(ids("name-asc"), ["c", "a", "b"]);
  assert.deepEqual(ids("name-desc"), ["b", "a", "c"]);
  assert.deepEqual(ids("published"), ["c", "a", "b"]);
  assert.deepEqual(ids("versions"), ["b", "a", "c"]);
  assert.deepEqual(source, [a, b, c]);
});

test("version count reflects actual recorded history, not version number", () => {
  const low = { ...a, versionCount: 1 };
  const high = { ...c, versionCount: 10 };
  assert.deepEqual(
    sortExerciseCatalog([low, high], "versions").map(v => v.latestVersion.exercise_id),
    ["c", "a"],
  );
});

test("invalid date and equal sorting values have deterministic fallback by ID", () => {
  const d = make("d", "Mesmo", "invalid", null, 1);
  const e = make("e", "Mesmo", "invalid", null, 1);
  assert.deepEqual(
    sortExerciseCatalog([e, d], "published").map(v => v.latestVersion.exercise_id),
    ["d", "e"],
  );
});

test("navigation preserves only bounded search, known status, sorting and page", () => {
  assert.equal(
    exerciseCatalogBackHref("  flexão ", "published", "name-asc", 3),
    "/admin/exercicios?q=flex%C3%A3o&status=published&ordem=name-asc&pagina=3",
  );
  assert.equal(
    exerciseDirectoryPageHref("  x ", "draft", 2, "published"),
    "/admin/exercicios?q=x&status=draft&ordem=published&pagina=2#biblioteca-exercicios",
  );
  assert.equal(
    exerciseCatalogBackHref("", "all"),
    "/admin/exercicios",
  );
});
