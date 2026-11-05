import assert from "node:assert/strict";
import test from "node:test";
import { planHistoricalInitialLoad } from "./historical-initial-load.ts";
import { prepareHistoricalInitialLoadRegistration } from "./historical-initial-load-ledger.ts";
import { syntheticXlsx, syntheticPng } from "../../tests/fixtures/imports/synthetic-archives.ts";

const batchId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const assets = [
  { kind: "xlsx" as const, bytes: syntheticXlsx() },
  { kind: "photo" as const, bytes: syntheticPng },
];

test("batch manifest includes only the opaque, exact, deterministic inventory", () => {
  const plan = planHistoricalInitialLoad(assets);
  const first = prepareHistoricalInitialLoadRegistration(plan, batchId);
  const second = prepareHistoricalInitialLoadRegistration(
    planHistoricalInitialLoad([...assets].reverse()), batchId,
  );
  assert.deepEqual(first, second);
  assert.equal(first.sources.length, 2);
  assert.match(first.manifest_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(first.sources.map((v) => v.source_id), ["source_0001", "source_0002"]);
  assert.doesNotMatch(JSON.stringify(first), /Medida|Data|PRIVATE|\.xlsx|\.png/);
});

test("proposal is only a candidate Client ID and changes manifest fingerprint", () => {
  const base = planHistoricalInitialLoad(assets);
  const withClient = planHistoricalInitialLoad(assets, [
    { sha256: base.files[0]!.sha256, client_id: clientId },
  ]);
  const a = prepareHistoricalInitialLoadRegistration(base, batchId);
  const b = prepareHistoricalInitialLoadRegistration(withClient, batchId);
  assert.notEqual(a.manifest_sha256, b.manifest_sha256);
  assert.equal(b.sources.filter((source) => source.client_id === clientId).length, 1);
  assert.equal(withClient.import_allowed, false);
});

test("rejects unknown, duplicate, conflicting and extra personally identifying fields", () => {
  const base = planHistoricalInitialLoad(assets);
  const forged = structuredClone(base) as unknown as { files: Array<Record<string, unknown>> };
  forged.files[0]!.full_name = "PRIVATE CLIENT NAME";
  assert.throws(
    () => prepareHistoricalInitialLoadRegistration(forged, batchId),
    (e: unknown) => e instanceof Error && e.message === "historical_initial_load_manifest_blocked"
      && !e.message.includes("PRIVATE CLIENT NAME"),
  );
  assert.throws(() => prepareHistoricalInitialLoadRegistration({
    ...base, original_client_name: "PRIVATE CLIENT NAME",
  }, batchId), /historical_initial_load_manifest_blocked/);
  const dup = structuredClone(base) as unknown as { files: Array<Record<string, unknown>> };
  dup.files[1]!.source_id = dup.files[0]!.source_id;
  assert.throws(() => prepareHistoricalInitialLoadRegistration(dup, batchId),
    /historical_initial_load_manifest_blocked/);
  assert.throws(() => prepareHistoricalInitialLoadRegistration({
    ...base, input_errors: ["unknown_association"],
  }, batchId), /historical_initial_load_manifest_blocked/);
});

test("refuses falsely approved states and missing client proposals", () => {
  const base = planHistoricalInitialLoad(assets);
  assert.throws(() => prepareHistoricalInitialLoadRegistration({
    ...base, import_allowed: true,
  }, batchId), /historical_initial_load_manifest_blocked/);
  const invalid = structuredClone(base) as unknown as { files: Array<Record<string, unknown>> };
  invalid.files[0]!.state = "pending_backend_identity_verification";
  assert.throws(() => prepareHistoricalInitialLoadRegistration(invalid, batchId),
    /historical_initial_load_manifest_blocked/);
});

test("duplicate files cannot become separately approved candidates", () => {
  const base = planHistoricalInitialLoad([assets[0]!, assets[0]!]);
  const valid = prepareHistoricalInitialLoadRegistration(base, batchId);
  assert.equal(valid.sources.every((entry) => entry.state === "duplicate_binary"), true);
  const forged = structuredClone(base) as unknown as { files: Array<Record<string, unknown>> };
  forged.files[1]!.state = "pending_human_association";
  delete forged.files[1]!.reason;
  assert.throws(() => prepareHistoricalInitialLoadRegistration(forged, batchId),
    /historical_initial_load_manifest_blocked/);
});
