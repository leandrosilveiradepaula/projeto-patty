import assert from "node:assert/strict";
import test from "node:test";

import { previewHistoricalArchives } from "./historical-archive-preview.ts";
import { previewHistoricalReconciliation } from "./historical-reconciliation-preview.ts";
import { syntheticPng, syntheticZip } from "../../tests/fixtures/imports/synthetic-archives.ts";

const ACTIVE_CLIENT = "11111111-1111-4111-8111-111111111111";
const INACTIVE_CLIENT = "22222222-2222-4222-8222-222222222222";

test("blocks every file and human decision when Client snapshot is incomplete or duplicated", () => {
  const preview = archivePreview([
    { name: "first.png", bytes: syntheticPng },
    { name: "second.png", bytes: new Uint8Array([...syntheticPng, 1]) },
  ]);
  const first = preview.archives[0]!.entries[0]!;
  const decision = { entry_id: first.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first.sha256!, client_id: ACTIVE_CLIENT };

  for (const snapshot of [
    [...clients(), { client_id: "invalid", client_status: "inactive" as const }],
    [...clients(), { client_id: INACTIVE_CLIENT, client_status: "inactive" as const }],
  ]) {
    const result = previewHistoricalReconciliation(preview, snapshot, [decision]);
    assert.equal(result.mode, "dry_run");
    assert.equal(result.persistence, "none");
    assert.equal(result.summary.pending_backend_identity_verification_count, 0);
    assert.equal(result.summary.pending_human_decision_count, 0);
    assert.equal(result.summary.blocked_count, 2);
    assert.ok(result.input_errors.length > 0);
    assert.ok(result.files.every((file) =>
      file.association.status === "blocked" && file.association.reason === "client_snapshot_untrusted",
    ));
    assert.deepEqual(result.decisions.map((item) => [item.status, item.reason]), [
      ["blocked", "client_snapshot_untrusted"],
    ]);
    // Untrusted snapshots must never partially authorize even known-good IDs.
    assert.doesNotMatch(JSON.stringify(result.files), /pending_backend_identity_verification/);
  }
});

test("creates an opaque, explicit reconciliation manifest while preserving active and inactive client state", () => {
  const preview = archivePreview([{ name: "first.png", bytes: syntheticPng }, { name: "second.png", bytes: new Uint8Array([...syntheticPng, 1]) }]);
  const first = preview.archives[0]!.entries[0]!;
  const second = preview.archives[0]!.entries[1]!;
  const result = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: second.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: second.sha256!, client_id: INACTIVE_CLIENT },
    { entry_id: first.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first.sha256!, client_id: ACTIVE_CLIENT },
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
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: second!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: second!.sha256!, client_id: INACTIVE_CLIENT },
  ]);
  const sameEntryConflict = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: INACTIVE_CLIENT },
  ]);

  assert.ok(duplicateConflict.files.every((file) => file.association.reason === "duplicate_binary_conflict"));
  assert.ok(sameEntryConflict.files.some((file) => file.association.reason === "conflicting_client_association"));
  assert.ok(sameEntryConflict.decisions.every((decision) => decision.status === "blocked"));
});

test("blocks invalid IDs, absent clients, mismatched hashes, and unknown entries without database access", () => {
  const preview = archivePreview([{ name: "only.png", bytes: syntheticPng }]);
  const entry = preview.archives[0]!.entries[0]!;
  const result = previewHistoricalReconciliation(preview, clients(), [
    { entry_id: entry.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: entry.sha256!, client_id: "not-a-uuid" },
    { entry_id: entry.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: "unknown_001", archive_sha256: preview.archives[0]!.sha256, entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: entry.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: entry.sha256!, client_id: "33333333-3333-4333-8333-333333333333" },
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
  const valid = { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT };
  const cases = [
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: "0".repeat(64), client_id: ACTIVE_CLIENT },
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: "33333333-3333-4333-8333-333333333333" },
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: "bad-uuid" },
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
    { entry_id: first!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first!.sha256!, client_id: ACTIVE_CLIENT },
    { entry_id: second!.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: second!.sha256!, client_id: INACTIVE_CLIENT },
  ];
  assert.deepEqual(previewHistoricalReconciliation(preview, clients(), decisions), previewHistoricalReconciliation(preview, clients(), [...decisions].reverse()));
});


test("blocks duplicate opaque source entry identifiers instead of choosing the last file", () => {
  const preview = archivePreview([{ name: "one.png", bytes: syntheticPng }, { name: "two.png", bytes: new Uint8Array([...syntheticPng, 1]) }]);
  const first = preview.archives[0]!.entries[0]!;
  const second = preview.archives[0]!.entries[1]!;
  // Synthetic manifest corruption: two different source files claim the same opaque ID.
  const corrupted = {
    ...preview,
    archives: preview.archives.map((archive) => ({
      ...archive,
      entries: archive.entries.map((entry) =>
        entry.entry_id === second.entry_id ? { ...entry, entry_id: first.entry_id } : entry),
    })),
  };
  const result = previewHistoricalReconciliation(corrupted, clients(), [
    { entry_id: first.entry_id, archive_sha256: preview.archives[0]!.sha256, entry_sha256: first.sha256!, client_id: ACTIVE_CLIENT },
  ]);
  assert.equal(result.files.length, 2);
  assert.ok(result.files.every((file) => file.association.status === "blocked" && file.association.reason === "duplicate_source_entry"));
  assert.equal(result.decisions[0]!.reason, "duplicate_source_entry");
  assert.equal(result.summary.pending_backend_identity_verification_count, 0);
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

test("rejects stale ZIP associations on reorder even with identical inner bytes", () => {
  const archiveA = syntheticZip([{ name: "first.png", bytes: syntheticPng }]);
  const archiveB = syntheticZip([{ name: "other.png", bytes: syntheticPng }]);
  const original = previewHistoricalArchives([{ bytes: archiveA }, { bytes: archiveB }]);
  const reordered = previewHistoricalArchives([{ bytes: archiveB }, { bytes: archiveA }]);
  const source = original.archives[0]!.entries[0]!;
  const decision = {
    entry_id: source.entry_id,
    archive_sha256: original.archives[0]!.sha256,
    entry_sha256: source.sha256!,
    client_id: ACTIVE_CLIENT,
  };
  assert.equal(reordered.archives[0]!.entries[0]!.entry_id, source.entry_id);
  assert.equal(reordered.archives[0]!.entries[0]!.sha256, source.sha256);
  assert.notEqual(reordered.archives[0]!.sha256, original.archives[0]!.sha256);
  const result = previewHistoricalReconciliation(reordered, clients(), [decision]);
  assert.equal(result.decisions[0]!.reason, "archive_hash_mismatch");
  assert.equal(result.files[0]!.association.status, "blocked");
  assert.equal(result.summary.pending_backend_identity_verification_count, 0);
});

test("blocks repeated identical ZIPs including files without human decisions", () => {
  const bytes = syntheticZip([{ name: "only.png", bytes: syntheticPng }]);
  const preview = previewHistoricalArchives([{ bytes }, { bytes }]);
  const first = preview.archives[0]!.entries[0]!;
  const result = previewHistoricalReconciliation(preview, clients(), [{
    entry_id: first.entry_id,
    archive_sha256: preview.archives[0]!.sha256,
    entry_sha256: first.sha256!,
    client_id: ACTIVE_CLIENT,
  }]);
  assert.equal(result.files.length, 2);
  assert.ok(result.files.every((file) =>
    file.association.status === "blocked" && file.association.reason === "duplicate_source_archive",
  ));
  assert.equal(result.decisions[0]!.reason, "duplicate_source_archive");
  assert.equal(result.summary.pending_backend_identity_verification_count, 0);
});

test("rejects missing ZIP hash while retaining a valid offline association as pending", () => {
  const preview = archivePreview([{ name: "only.png", bytes: syntheticPng }]);
  const first = preview.archives[0]!.entries[0]!;
  const decision = {
    entry_id: first.entry_id,
    archive_sha256: "",
    entry_sha256: first.sha256!,
    client_id: ACTIVE_CLIENT,
  };
  const blocked = previewHistoricalReconciliation(preview, clients(), [decision]);
  assert.equal(blocked.decisions[0]!.reason, "archive_hash_mismatch");
  assert.equal(blocked.summary.pending_backend_identity_verification_count, 0);
  const valid = previewHistoricalReconciliation(preview, clients(), [{ ...decision, archive_sha256: preview.archives[0]!.sha256 }]);
  assert.equal(valid.decisions[0]!.status, "pending_backend_identity_verification");
  assert.equal(valid.files[0]!.association.status, "pending_backend_identity_verification");
  assert.doesNotMatch(JSON.stringify(valid), /only\\.png/);
});
