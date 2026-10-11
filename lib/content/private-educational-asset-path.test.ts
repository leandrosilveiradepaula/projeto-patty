import assert from "node:assert/strict";
import test from "node:test";
import { createEducationalAssetUploadPath, isEducationalAssetUploadPathForVersion } from "./private-educational-asset-path.ts";

const contentId = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const facts = { contentId, versionId, contentType: "application/pdf" };

test("each upload grant has a new opaque private path under its own version", () => {
  const one = createEducationalAssetUploadPath(facts)!;
  const two = createEducationalAssetUploadPath(facts)!;
  assert.notEqual(one, two);
  for (const storagePath of [one, two]) {
    assert.ok(isEducationalAssetUploadPathForVersion({ ...facts, storagePath }));
    assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, contentId: otherId, storagePath }), false);
    assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, versionId: otherId, storagePath }), false);
    assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, contentType: "image/png", storagePath }), false);
  }
});

test("an outstanding deterministic legacy grant remains scoped to its exact version", () => {
  const storagePath = `educational-${contentId}-${versionId}-primary.pdf`;
  assert.ok(isEducationalAssetUploadPathForVersion({ ...facts, storagePath }));
  assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, versionId: otherId, storagePath }), false);
});

test("rejects forged paths, traversal and unsupported content types", () => {
  const path = createEducationalAssetUploadPath(facts)!;
  for (const storagePath of [
    path + "/../escape",
    path.replace("-primary.pdf", "-secondary.pdf"),
    path.replace(".pdf", ".html"),
    path.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-4/, "-malicious-4"),
  ]) assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, storagePath }), false);
  assert.equal(createEducationalAssetUploadPath({ ...facts, contentType: "text/html" }), null);
  assert.equal(isEducationalAssetUploadPathForVersion({ ...facts, storagePath: path, contentType: "text/html" }), false);
});
