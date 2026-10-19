import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) =>
  readFileSync(new URL("../../" + name, import.meta.url), "utf8");

test("professional exercise catalog sorts authorized rows before paginating", () => {
  const source = read("app/admin/exercicios/page.tsx");
  assert.match(source, /readExerciseCatalogSort\(ordem\)/);
  assert.match(source, /sortExerciseCatalog\(/);
  assert.match(source, /versionsByExercise\.get\(summary\.latestVersion\.exercise_id\)\?\.length/);
  assert.match(source, /\.\.\.orderedExercises\.map\(summary/);
  assert.match(source, /paginateExerciseDirectory\(orderedCatalog, pageRequest\.page\)/);
  assert.match(source, /<select defaultValue=\{sort\} name="ordem">/);
  assert.match(source, /exerciseDirectoryPageHref\(searchTerm, statusFilter, directory\.page \+ 1, sort\)/);
  assert.match(source, /exerciseCatalogBackHref\(searchTerm, statusFilter, sort, directory\.page\)/);
  assert.doesNotMatch(source, /service_role|createAdminClient/);
});

test("exercise detail return preserves status and source page without altering version history", () => {
  const source = read("app/admin/exercicios/[exerciseId]/page.tsx");
  assert.match(source, /readExerciseCatalogSort\(filters\.ordem\)/);
  assert.match(source, /readExerciseDirectoryPage\(filters\.pagina\)\.page/);
  assert.match(source, /exerciseCatalogBackHref\(term, status, sort, page\)/);
  assert.match(source, /findSingleDraftExerciseVersion\(versions\)/);
  assert.match(source, /getAccessibleExerciseForCurrentAdmin\(exerciseId\)/);
  assert.doesNotMatch(source, /autoPublish|automaticPrescription/);
});
