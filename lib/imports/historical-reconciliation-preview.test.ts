import assert from "node:assert/strict";
import test from "node:test";

import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { previewHistoricalReconciliation } from "./historical-reconciliation-preview.ts";
import { syntheticPng, syntheticZip } from "../../tests/fixtures/imports/synthetic-archives.ts";

const ACTIVE_CLIENT = "11111111-1111-4111-8111-111111111111";
const INACTIVE_CLIENT = "22222222-2222-4222-8222-222222222222";

test("creates an opaque, explicit reconciliation manifest while preserving active and inactive client state", () => {
  const preview = archivePreview([{ name: "first.png", bytes: syntheticPng }, { name: "second.png", bytes: new Uint8Array([...syntheticPng, 1]) }]);
  const first = preview.archives[0]!.entries[0]!;
  const second = preview.archives[0]!.entries[1]!;
  const result = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: second.entry_id, entry_sha256: second.sha256!, client_id: INACTIVE_CLIENT },
    { entry_id: first.entry_id, entry_sha256: first.sha256!, client_id: ACTIVE_CLIENT },
  ]);

  assert.equal(result.mode, "dry_run");
  assert.equal(result.persistence, "none");
  assert.deepEqual(result.identity_scope, {
    client: "existing_client_id_only",
    auth_user: "excluded",
    profile: "excluded",
    assignment: "excluded",
    identity_verification: "authorized_backend_required",
  });
  assert.deepEqual(result.files.map((file) => file.association), [
    { status: "pending_backend_identity_verification", client_id: ACTIVE_CLIENT, client_status: "active" },
    { status: "pending_backend_identity_verification", client_id: INACTIVE_CLIENT, client_status: "inactive" },
  ]);
  assert.equal(result.summary.pending_backend_identity_verification_count, 2);
  assert.doesNotMatch(JSON.stringify(result), /first\.png|second\.png/);
});

test("keeps clients without a human decision pending and represents duplicate binaries without auto-association", () => {
  const preview = archivePreview([{ name: "one.png", bytes: syntheticPng }, { name: "two.png", bytes: syntheticPng }]);
  const result = previewHistoricalReconciliation(preview, clients(), []);

  assert.equal(result.files.length, 2);
  assert.ok(result.files.every((file) => file.association.status === "pending_human_decision"));
  assert.equal(result.duplicate_binary_groups.length, 1);
  assert.equal(result.duplicate_binary_groups[0]!.entry_ids.length, 2);
});

test("blocks conflicting associations and duplicate binaries targeted at different clients", () => {
  const preview = archivePreview([{ name: "one.png", bytes: syntheticPng }, { name: "two.png", bytes: syntheticPng }]);
  const [first, second] = preview.archives[0]!.entries;
  const duplicateConflict = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: second!.entry_id, entry_sha256: second!.sha256!, client_id: INACTIVE_CLIENT },
  ]);
  const sameEntryConflict = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: INACTIVE_CLIENT },
  ]);

  assert.ok(duplicateConflict.files.every((file) => file.association.reason === "duplicate_binary_conflict"));
  assert.ok(sameEntryConflict.files.some((file) => file.association.reason === "conflicting_client_association"));
  assert.ok(sameEntryConflict.decisions.every((decision) => decision.status === "blocked"));
});

test("blocks invalid IDs, absent clients, mismatched hashes, and unknown entries without database access", () => {
  const preview = archivePreview([{ name: "only.png", bytes: syntheticPng }]);
  const entry = preview.archives[0]!.entries[0]!;
  const result = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: entry.entry_id, entry_sha256: entry.sha256!, client_id: "not-a-uuid" },
    { entry_id: entry.entry_id, entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: "unknown_001", entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: entry.entry_id, entry_sha256: entry.sha256!, client_id: "33333333-3333-4333-8333-333333333333" },
  ]);

  assert.deepEqual(result.decisions.map((decision) => decision.reason).sort(), [
    "client_not_found",
    "entry_hash_mismatch",
    "invalid_client_id",
    "unknown_entry",
  ]);
  assert.equal(result.files[0]!.association.status, "blocked");
});

test("fails closed when a valid association shares its entry with an invalid human decision", () => {
  const preview = archivePreview([{ name: "first.png", bytes: syntheticPng }, { name: "second.png", bytes: new Uint8Array([...syntheticPng, 1]) }]);
  const [first, second] = preview.archives[0]!.entries;
  const valid = { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT };
  const cases = [
    { entry_id: first!.entry_id, entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: "33333333-3333-4333-8333-333333333333" },
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: "bad-uuid" },
  ];

  for (const invalid of cases) {
    const decisionList = [valid, invalid];
    const result = previewHistoricalReconciliation(preview, clients(), decisionList);
    assert.equal(result.files.find((file) => file.entry_id === first!.entry_id)!.association.status, "blocked");
    assert.equal(result.files.find((file) => file.entry_id === second!.entry_id)!.association.status, "pending_human_decision");
    assert.ok(result.decisions.filter((decision) => decision.entry_id === first!.entry_id).every((decision) => decision.status === "blocked"));
    assert.equal(result.summary.pending_backend_identity_verification_count, 0);
    assert.deepEqual(result, previewHistoricalReconciliation(preview, clients(), [...decisionList].reverse()));
  }

  const onlyValid = previewHistoricalReconciliation(preview, clients(), [valid]);
  assert.equal(onlyValid.files.find((file) => file.entry_id === first!.entry_id)!.association.status, "pending_backend_identity_verification");
});

test("is deterministic when identical human decisions arrive in a different order", () => {
  const preview = archivePreview([{ name: "one.png", bytes: syntheticPng }, { name: "two.png", bytes: new Uint8Array([...syntheticPng, 1]) }]);
  const [first, second] = preview.archives[0]!.entries;
  const decisions = [
    { entry_id: first!.entry_id, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: second!.entry_id, entry_sha256: second!.sha256!, client_id: INACTIVE_CLIENT },
  ];
  assert.deepEqual(previewHistoricalReconciliation(preview, clients(), decisions), previewHistoricalReconciliation(preview, clients(), [...decisions].reverse()));
});

function archivePreview(members: Parameters<typeof syntheticZip>[0]) {
  return previewHistoricalArchives([{ bytes: syntheticZip(members) }]);
}

function clients() {
  return [
    { client_id: ACTIVE_CLIENT, client_status: "active" as const },
    { client_id: INACTIVE_CLIENT, client_status: "inactive" as const },
  ];
}
