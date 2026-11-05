import assert from "node:assert/strict";
import test from "node:test";
import { reconcileHistoricalLedgerPage } from "./historical-ledger-reconciliation.ts";

const clientId = "11111111-1111-4111-8111-111111111111";
const receiptId = "22222222-2222-4222-8222-222222222222";
const source = {
  source_id: "source_0001", source_sha256: "a".repeat(64),
  kind: "xlsx", state: "pending_backend_identity_verification", proposed_client_id: clientId,
};
const receipt = {
  id: receiptId, source_id: "source_0001", client_id: clientId,
  source_sha256: "a".repeat(64), state: "staged_private",
};

test("only exact client, SHA, source and private state prove XLSX staging", () => {
  assert.deepEqual(reconcileHistoricalLedgerPage([source], [receipt]), [{
    source_id: "source_0001", status: "saved_private",
    receipt_id: receiptId, client_id: clientId,
  }]);
  for (const altered of [
    { client_id: "33333333-3333-4333-8333-333333333333" },
    { source_sha256: "b".repeat(64) },
    { source_id: "source_0002" },
    { state: "published" },
    { id: "invalid" },
  ]) {
    const got = reconcileHistoricalLedgerPage([source], [{ ...receipt, ...altered }]);
    // A receipt claiming a different source is not counted as a receipt for this source.
    assert.equal(got[0]?.status, altered.source_id ? "not_saved" : "conflict");
    assert.equal(got[0]?.receipt_id, undefined);
  }
});

test("duplicate or wrong-kind receipt does not produce a client link", () => {
  assert.equal(reconcileHistoricalLedgerPage([source], [receipt, receipt])[0]?.status, "conflict");
  assert.equal(reconcileHistoricalLedgerPage([{ ...source, kind: "photo" }], [receipt])[0]?.status, "conflict");
  assert.equal(reconcileHistoricalLedgerPage([{ ...source, proposed_client_id: null }], [receipt])[0]?.status, "conflict");
});

test("missing sources stay pending and absent table means unavailable not zero", () => {
  assert.equal(reconcileHistoricalLedgerPage([source], [])[0]?.status, "not_saved");
  assert.equal(reconcileHistoricalLedgerPage([source], null)[0]?.status, "unavailable");
  assert.equal(reconcileHistoricalLedgerPage([{
    ...source, state: "duplicate_binary", proposed_client_id: null,
  }], [])[0]?.status, "blocked");
  assert.deepEqual(reconcileHistoricalLedgerPage([], []), []);
  assert.doesNotMatch(JSON.stringify(reconcileHistoricalLedgerPage([source], [receipt])),
    /raw_value|original_answers|storage_path|full_name|email/);
});
