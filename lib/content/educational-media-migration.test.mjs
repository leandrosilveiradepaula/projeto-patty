import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(here, "../../docs");

const batch = JSON.parse(
  fs.readFileSync(
    path.join(docsDir, "educational_media_migration_batch_1.json"),
    "utf8",
  ),
);
const sourceManifest = JSON.parse(
  fs.readFileSync(path.join(docsDir, "drive_content_manifest.json"), "utf8"),
);

test("batch 1 contains only the approved food-scale video", () => {
  assert.equal(batch.schema_version, 1);
  assert.equal(batch.batch_key, "educational_media_batch_1_food_scale");
  assert.equal(batch.batch_status, "upload_ready_manual_transfer_pending");
  assert.equal(batch.items.length, 1);

  const item = batch.items[0];
  assert.equal(item.source.file_id, "1z61DpJfwp-6DMhYMpCRNafkSwX6h9LBE");
  assert.equal(item.source.original_title, "MovaviClips_Video_20220217-143151.mp4");
  assert.equal(item.source.mime_type, "video/mp4");
  assert.equal(item.source.size_bytes, 123262796);
  assert.equal(item.source.preserve_original, true);
});

test("batch 1 source metadata matches the immutable Drive inventory", () => {
  const item = batch.items[0];
  const source = sourceManifest.items.find(
    (candidate) => candidate.source_file_id === item.source.file_id,
  );

  assert.ok(source, "approved source must exist in the Drive manifest");
  assert.equal(source.source_folder_id, item.source.folder_id);
  assert.equal(source.source_folder_title, item.source.folder_title);
  assert.equal(source.original_title, item.source.original_title);
  assert.equal(source.mime_type, item.source.mime_type);
  assert.equal(source.size_bytes, item.source.size_bytes);
  assert.equal(source.modified_time, item.source.modified_time);
  assert.equal(source.client_scoped, false);
  assert.equal(source.target_library, "educational");
});

test("batch 1 preserves source integrity preflight and stays fail-closed before upload", () => {
  const item = batch.items[0];

  assert.equal(item.target.storage_provider, "vercel_blob");
  assert.equal(item.target.blob_access, "private");
  assert.equal(item.target.asset_key, "primary");
  assert.equal(
    item.target.storage_path,
    "educational-610df135-7c00-47a3-b978-2ba44411ae43-ae45c5db-e6af-46db-9230-b05bc4f5a5bd-primary.mp4",
  );
  assert.equal(item.target.storage_path_policy, "system_generated_opaque_no_pii");

  assert.equal(item.integrity.expected_size_bytes, item.source.size_bytes);
  assert.equal(
    item.integrity.sha256_hex,
    "ee05d6c12ea02db283234f5d69a09ff60c4d831183fe6715d7aa9848e76905b1",
  );
  assert.equal(
    item.integrity.sha256_status,
    "preflight_verified_reverify_before_upload",
  );
  assert.equal(item.integrity.preflight_observed_size_bytes, item.source.size_bytes);
  assert.equal(item.integrity.preflight_observed_mime_type, item.source.mime_type);
  assert.equal(item.integrity.preflight_duration_seconds, 141.162667);
  assert.equal(item.integrity.preflight_video_codec, "h264");
  assert.equal(item.integrity.preflight_video_width, 1920);
  assert.equal(item.integrity.preflight_video_height, 1080);
  assert.equal(item.integrity.preflight_audio_codec, "aac");
  assert.match(
    item.integrity.preflight_note,
    /re-download and re-hash are still required before Blob upload/,
  );

  assert.equal(
    item.supabase.educational_content_id,
    "610df135-7c00-47a3-b978-2ba44411ae43",
  );
  assert.equal(
    item.supabase.educational_content_version_id,
    "ae45c5db-e6af-46db-9230-b05bc4f5a5bd",
  );
  assert.equal(item.supabase.educational_content_asset_id, null);
  assert.equal(item.supabase.draft_version_status, "created_unpublished");

  assert.equal(item.target.blob_store_name, "projeto-patty-blob");
  assert.equal(item.target.blob_store_region, "iad1");
  assert.equal(item.target.blob_auth_mode, "oidc");
  assert.equal(item.operation.blob_store_status, "created_connected_private");
  assert.equal(item.operation.blob_store_verified_at, "2026-10-03");
  assert.equal(item.operation.source_download_status, "downloaded_reverified_for_upload");
  assert.equal(item.integrity.source_reverified_size_bytes, item.source.size_bytes);
  assert.equal(item.integrity.latest_source_reverified_at, "2026-10-07");
  assert.equal(item.integrity.latest_source_reverified_size_bytes, item.source.size_bytes);
  assert.equal(item.integrity.latest_source_reverified_mime_type, item.source.mime_type);
  assert.match(item.integrity.latest_source_reverification_note, /SHA-256 was not recomputed/);
  assert.equal(
    item.integrity.source_reverified_sha256_hex,
    item.integrity.sha256_hex,
  );
  assert.equal(item.operation.blob_upload_status, "not_started");
  assert.equal(item.operation.asset_registration_status, "not_started");
  assert.equal(item.operation.publication_status, "not_started");
  assert.equal(item.operation.client_release_status, "not_started");
});

test("batch 1 preserves the required human and release gates", () => {
  const steps = batch.required_sequence;

  assert.deepEqual(steps, [
    "create_or_connect_private_vercel_blob_store",
    "download_exact_approved_source_without_modifying_drive_original",
    "verify_source_size_and_mime",
    "calculate_sha256",
    "create_or_select_unpublished_educational_content_version",
    "generate_opaque_storage_path_without_pii",
    "upload_private_blob",
    "verify_uploaded_size_mime_and_sha256",
    "register_educational_content_asset_while_version_is_draft",
    "human_review",
    "explicit_publication",
    "explicit_client_release",
  ]);
});

test("Vercel Blob provisioning runbook preserves private fail-closed boundary", () => {
  const runbook = fs.readFileSync(
    path.join(docsDir, "VERCEL_BLOB_SETUP.md"),
    "utf8",
  );

  for (const required of [
    "vercel blob create-store projeto-patty-educational-media --access private --environment production --yes",
    "vercel blob list-stores",
    "acesso e `private`",
    "nenhum arquivo foi enviado ainda",
    "nenhum asset foi criado no Supabase",
    "BLOB_READ_WRITE_TOKEN",
    "VERCEL_OIDC_TOKEN",
  ]) {
    assert.equal(
      runbook.includes(required),
      true,
      "Blob provisioning runbook must preserve: " + required,
    );
  }

  assert.equal(
    runbook.includes("--access public"),
    false,
    "Educational Blob store must never be provisioned as public.",
  );
});



test("batch 1 cannot claim registration or release before a verified Blob upload", () => {
  const item = batch.items[0];

  if (item.operation.blob_upload_status !== "verified") {
    assert.equal(item.supabase.educational_content_asset_id, null);
    assert.equal(item.operation.asset_registration_status, "not_started");
    assert.equal(item.operation.publication_status, "not_started");
    assert.equal(item.operation.client_release_status, "not_started");
  }
});

test("batch 1 uses a strict lowercase SHA-256 and opaque non-PII storage path", () => {
  const item = batch.items[0];

  assert.match(item.integrity.sha256_hex, /^[0-9a-f]{64}$/);
  assert.equal(item.target.storage_path.includes(item.source.original_title), false);
  assert.equal(item.target.storage_path.includes(item.source.file_id), false);
  assert.equal(item.target.storage_path.includes("@"), false);
  assert.equal(item.target.storage_path.includes(" "), false);
});


test("asset registration verifies the private Blob object before persisting metadata", () => {
  const action = read("app/admin/conteudos/[contentId]/actions.ts");
  const integrity = read("lib/content/private-blob-integrity.ts");

  assert.match(action, /await verifyPrivateBlobAsset\(\{/);
  assert.ok(
    action.indexOf("await verifyPrivateBlobAsset") <
      action.indexOf("await createAccessibleEducationalContentAsset"),
    "Blob verification must happen before metadata persistence.",
  );
  assert.match(integrity, /await head\(asset\.storagePath\)/);
  assert.match(integrity, /metadata\.pathname !== asset\.storagePath/);
  assert.match(integrity, /metadata\.size !== asset\.byteSize/);
  assert.match(integrity, /metadata\.contentType !== asset\.contentType/);
});
