import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = "docs/source_drafts/exercise_library_historical_source.json";

test("exercise source queue remains metadata-only and fail-closed", async () => {
  const source = JSON.parse(await readFile(path, "utf8"));

  assert.equal(source.schema_version, 1);
  assert.equal(source.status, "historical_exercise_source_review_required");
  assert.equal(source.publishable, false);
  assert.equal(source.summary.source_items, 74);
  assert.equal(source.summary.generic_titles_requiring_visual_review, 9);
  assert.equal(source.summary.possible_duplicate_groups, 16);
  assert.equal(source.summary.possible_duplicate_items, 32);

  assert.equal(new Set(source.items.map((item) => item.source_file_id)).size, 74);

  for (const item of source.items) {
    assert.equal(item.proposed_category_status, "hypothesis_from_metadata");
    assert.equal(item.authorship_status, "unreviewed");
    assert.equal(item.rights_status, "unreviewed");
    assert.equal(item.migration_status, "inventory_only");
    assert.equal(item.publication_status, "not_authorized");
    assert.equal(item.review_flags.includes("exercise_technical_review_required"), true);
  }
});

test("exercise duplicate groups preserve only source references", async () => {
  const source = JSON.parse(await readFile(path, "utf8"));

  assert.equal(source.duplicate_groups.length, 16);

  for (const group of source.duplicate_groups) {
    assert.equal(group.source_file_ids.length, 2);
    for (const sourceFileId of group.source_file_ids) {
      assert.equal(
        source.items.some((item) => item.source_file_id === sourceFileId),
        true,
      );
    }
  }
});
