import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("Drive triage preserves the manifest one-to-one and cannot authorize migration/publication", async () => {
  const manifest = await readJson("docs/drive_content_manifest.json");
  const triage = await readJson("docs/drive_content_triage.json");

  assert.equal(triage.item_count, manifest.item_count);
  assert.equal(triage.items.length, manifest.items.length);

  const manifestIds = manifest.items.map((item) => item.source_file_id).sort();
  const triageIds = triage.items.map((item) => item.source_file_id).sort();

  assert.deepEqual(triageIds, manifestIds);
  assert.equal(new Set(triageIds).size, triageIds.length);

  for (const item of triage.items) {
    assert.equal(item.rights_status, "unreviewed");
    assert.equal(item.migration_status, "inventory_only");
    assert.equal(item.publication_status, "not_authorized");
    assert.equal(item.proposed_category_status, "hypothesis_from_metadata");
  }
});

test("Drive triage summary is derived from the current item set", async () => {
  const triage = await readJson("docs/drive_content_triage.json");

  const educational = triage.items.filter(
    (item) => item.target_library === "educational",
  );
  const exercise = triage.items.filter(
    (item) => item.target_library === "exercise",
  );
  const genericExercise = exercise.filter(
    (item) => item.proposed_category === "exercise_video_unclassified_title",
  );
  const duplicateGroups = new Map();

  for (const item of exercise) {
    if (!item.possible_duplicate_group) continue;
    const ids = duplicateGroups.get(item.possible_duplicate_group) ?? [];
    ids.push(item.source_file_id);
    duplicateGroups.set(item.possible_duplicate_group, ids);
  }

  const duplicateItems = [...duplicateGroups.values()].reduce(
    (total, ids) => total + ids.length,
    0,
  );

  assert.equal(triage.summary.educational_items, educational.length);
  assert.equal(triage.summary.exercise_items, exercise.length);
  assert.equal(
    triage.summary.exercise_generic_titles_requiring_content_review,
    genericExercise.length,
  );
  assert.equal(
    triage.summary.exercise_descriptive_titles,
    exercise.length - genericExercise.length,
  );
  assert.equal(
    triage.summary.possible_duplicate_groups,
    duplicateGroups.size,
  );
  assert.equal(
    triage.summary.possible_duplicate_items,
    duplicateItems,
  );
  assert.equal(triage.summary.rights_reviewed_items, 0);
  assert.equal(triage.summary.migration_authorized_items, 0);
  assert.equal(triage.summary.publication_authorized_items, 0);
});
